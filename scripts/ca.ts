import * as fs from 'node:fs';
import path from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The bundle that macOS command-line tools (curl, git, python3, openssl) read.
// It has no revocation checking and only changes when macOS replaces it.
export const CERT = '/etc/ssl/cert.pem';
const LIST = 'ca/distrusted.json';
// zsh/zshrc reads the first line of this file, so keep both formats in sync.
export const STAMP = '.local/state/dotfiles/ca/last-check';

export interface Entry {
  name: string;
  sha256: string;
  advisory: string;
  added: string;
}

export interface Action {
  status: 'ok' | 'remove' | 'retired';
  entry: Entry;
}

export interface Stamp {
  signature: string;
  sha256: string;
  // Listed roots that a macOS-replaced bundle no longer contained.
  retired: string[];
}

export interface InstallOptions {
  apply?: boolean;
  log?: (message: string) => void;
  cert?: string;
  write?: (source: string, dest: string) => void;
}

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const KEYS = ['name', 'sha256', 'advisory', 'added'];

function field(item: Record<string, unknown>, key: string, index: number): string {
  const value = item[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${LIST}[${index}].${key} must be a non-empty string`);
  return value;
}

export function entries(root = ROOT): Entry[] {
  const data: unknown = JSON.parse(fs.readFileSync(path.join(root, LIST), 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${LIST} must be an array`);
  const seen = new Set<string>();
  return data.map((item: unknown, index): Entry => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new Error(`${LIST}[${index}] must be an object`);
    const record = item as Record<string, unknown>;
    const extra = Object.keys(record).filter(key => !KEYS.includes(key));
    if (extra.length > 0) throw new Error(`${LIST}[${index}] has unknown keys: ${extra.join(', ')}`);
    const entry = {
      name: field(record, 'name', index),
      sha256: field(record, 'sha256', index),
      advisory: field(record, 'advisory', index),
      added: field(record, 'added', index),
    };
    if (!FINGERPRINT.test(entry.sha256)) throw new Error(`${LIST}[${index}].sha256 must be an uppercase, colon-separated SHA-256 fingerprint`);
    if (seen.has(entry.sha256)) throw new Error(`${LIST}[${index}] repeats ${entry.sha256}`);
    seen.add(entry.sha256);
    if (!entry.advisory.startsWith('https://')) throw new Error(`${LIST}[${index}].advisory must be an https URL`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.added) || Number.isNaN(Date.parse(entry.added))) throw new Error(`${LIST}[${index}].added must be a YYYY-MM-DD date`);
    return entry;
  });
}

interface Block {
  // Lines from just after the previous certificate through this one's END line.
  start: number;
  end: number;
  sha256: string;
}

function fingerprint(base64: string): string {
  const hex = createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex').toUpperCase();
  return hex.match(/../g)?.join(':') ?? '';
}

export function blocks(text: string): Block[] {
  const lines = text.split('\n');
  const found: Block[] = [];
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== '-----BEGIN CERTIFICATE-----') continue;
    const end = lines.indexOf('-----END CERTIFICATE-----', i);
    if (end === -1) throw new Error(`Unterminated certificate at line ${i + 1}`);
    found.push({ start, end, sha256: fingerprint(lines.slice(i + 1, end).join('')) });
    start = end + 1;
    i = end;
  }
  return found;
}

// Drops each matching certificate with its "=== subject" header and text dump.
// Apple's "### Organization" group headers stay, like comments.
export function filter(text: string, remove: ReadonlySet<string>): string {
  const lines = text.split('\n');
  const drop = new Set<number>();
  for (const block of blocks(text)) {
    if (!remove.has(block.sha256)) continue;
    let first = block.start;
    while (first < block.end && !lines[first]?.startsWith('=== ') && lines[first] !== '-----BEGIN CERTIFICATE-----') first++;
    for (let i = first; i <= block.end; i++) drop.add(i);
  }
  return lines.filter((_, i) => !drop.has(i)).join('\n');
}

export function signature(cert: string): string {
  // Inode, mtime in seconds, and size, matching zsh's `zstat` in zsh/zshrc.
  const info = fs.statSync(cert, { bigint: true });
  return `${info.ino} ${info.mtimeNs / 1_000_000_000n} ${info.size}`;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function readStamp(home: string): Stamp | null {
  let text: string;
  try { text = fs.readFileSync(path.join(home, STAMP), 'utf8'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
  const [line, hash, retired = ''] = text.split('\n');
  return line && hash ? { signature: line, sha256: hash, retired: retired.split(' ').filter(Boolean) } : null;
}

function writeStamp(home: string, cert: string, actions: Action[]): void {
  const file = path.join(home, STAMP);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const retired = actions.filter(action => action.status === 'retired').map(action => action.entry.sha256);
  const temp = `${file}.${randomUUID()}`;
  fs.writeFileSync(temp, `${signature(cert)}\n${sha256(fs.readFileSync(cert, 'utf8'))}\n${retired.join(' ')}\n`, { flag: 'wx' });
  fs.renameSync(temp, file);
}

function sudoInstall(source: string, dest: string): void {
  execFileSync('sudo', ['install', '-m', '0644', '-o', 'root', '-g', 'wheel', source, dest], { stdio: 'inherit' });
}

function plan(list: Entry[], cert: string, text: string, stamp: Stamp | null): Action[] {
  const present = new Set(blocks(text).map(block => block.sha256));
  // A replaced file is one this script has not seen: new content, or a new inode
  // when macOS ships text identical to our filtered copy. Without a stamp there is
  // no earlier file to compare, so an absent root may have been removed by hand.
  const inode = (value: string) => value.split(' ')[0];
  const replaced = stamp !== null && (stamp.sha256 !== sha256(text) || inode(stamp.signature) !== inode(signature(cert)));
  return list.map(entry => ({
    entry,
    status: present.has(entry.sha256) ? 'remove' : replaced || stamp?.retired.includes(entry.sha256) ? 'retired' : 'ok',
  }));
}

function retiredMessage(entry: Entry, cert: string): string {
  return `retired ${entry.name}: macOS no longer ships it in ${cert}. Delete it from ${LIST}.`;
}

// Retirement found by an earlier install or status run, recorded in the stamp.
export function retired(root: string, home: string): Entry[] {
  const stamp = readStamp(home);
  return entries(root).filter(entry => stamp?.retired.includes(entry.sha256));
}

export function install(root: string, home: string, { apply = false, log = console.log, cert = CERT, write = sudoInstall }: InstallOptions = {}): Action[] {
  home = fs.realpathSync(home);
  const list = entries(root);
  const text = fs.readFileSync(cert, 'utf8');
  const actions = plan(list, cert, text, readStamp(home));
  for (const { status, entry } of actions) {
    if (status === 'retired') log(retiredMessage(entry, cert));
    else log(`${status.padEnd(7)} ${entry.name} ${status === 'ok' ? `not in ${cert}` : `from ${cert} (${entry.advisory})`}`);
  }
  if (!apply) return actions;

  const remove = new Set(actions.filter(action => action.status === 'remove').map(action => action.entry.sha256));
  if (remove.size > 0) {
    const before = blocks(text).length;
    const filtered = filter(text, remove);
    const after = blocks(filtered).length;
    if (after === 0 || after !== before - remove.size) throw new Error(`Refusing to write ${cert}: expected ${before - remove.size} certificates, got ${after}`);

    const backup = path.join(home, '.local/state/dotfiles/backups', randomUUID().replaceAll('-', ''), path.relative('/', cert));
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(cert, backup);
    log(`backup  ${backup}`);

    const dir = fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-ca-'));
    try {
      const temp = path.join(dir, 'cert.pem');
      fs.writeFileSync(temp, filtered, { mode: 0o644 });
      write(temp, cert);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (fs.readFileSync(cert, 'utf8') !== filtered) throw new Error(`${cert} does not match what was written. Restore it from ${backup}.`);
  }
  writeStamp(home, cert, actions);
  return actions;
}

// Run by zsh/zshrc when the bundle's inode, mtime, or size changes. Quiet unless
// something needs attention. Leaves the stamp alone while a root needs removing,
// so every new shell repeats the warning until it is fixed.
export function status(root: string, home: string, { log = console.log, cert = CERT }: Pick<InstallOptions, 'log' | 'cert'> = {}): Action[] {
  home = fs.realpathSync(home);
  const stamp = readStamp(home);
  if (stamp?.signature === signature(cert)) return [];
  const actions = plan(entries(root), cert, fs.readFileSync(cert, 'utf8'), stamp);
  const remove = actions.filter(action => action.status === 'remove');
  if (remove.length > 0) {
    log(`dotfiles: ${cert} trusts ${remove.map(action => action.entry.name).join(', ')} again, likely after a macOS update.`);
    log(`dotfiles: run \`pnpm --dir ${root} run ca install --apply\` to remove ${remove.length === 1 ? 'it' : 'them'}.`);
    return actions;
  }
  for (const { status: state, entry } of actions) if (state === 'retired') log(`dotfiles: ${retiredMessage(entry, cert)}`);
  writeStamp(home, cert, actions);
  return actions;
}

export function main(args = process.argv.slice(2)): number {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
      apply: { type: 'boolean', default: false }, home: { type: 'string', default: homedir() }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
      console.log('Usage: pnpm run ca <check|install|status> [--apply] [--home PATH]\nPreview unless --apply. --home selects an existing alternate home for the stamp and backups.');
      return 0;
    }
    const command = positionals[0] ?? '';
    if (positionals.length !== 1 || !['check', 'install', 'status'].includes(command)) throw new Error('Expected check, install, or status. Use --help for usage.');
    if (values.apply && command !== 'install') throw new Error('--apply is only valid with install');
    if (command === 'check') {
      console.log(`Verified ${entries().length} distrusted CA roots.`);
      for (const entry of retired(ROOT, values.home)) console.log(`warn    ${retiredMessage(entry, CERT)}`);
      return 0;
    }
    if (process.platform !== 'darwin') throw new Error('This installer is scoped to macOS');
    const home = path.resolve(values.home);
    if (command === 'status') status(ROOT, home);
    else {
      install(ROOT, home, { apply: values.apply });
      if (!values.apply) console.log('Preview only. Add --apply to write these changes.');
    }
    return 0;
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
