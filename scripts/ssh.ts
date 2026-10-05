import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'ssh/devbox.conf';
const LINK = '.ssh/config.d/devbox.conf';
const CONFIG = '.ssh/config';
// Relative Include paths in the user config resolve against ~/.ssh.
export const INCLUDE = 'Include config.d/devbox.conf';

export interface Action {
  status: 'ok' | 'replace' | 'create' | 'update';
  source: string;
  dest: string;
}

export interface InstallOptions {
  apply?: boolean;
  log?: (message: string) => void;
  link?: (source: string, dest: string, type: 'file') => void;
}

export function hosts(text: string): string[] {
  return text.split('\n').flatMap(line => {
    const match = /^\s*Host\s+(.+)$/i.exec(line);
    return match?.[1] ? match[1].trim().split(/\s+/) : [];
  });
}

export function verify(root = ROOT): string[] {
  const source = path.join(root, SOURCE);
  if (!fs.statSync(source).isFile()) throw new Error(`Expected SSH host file: ${source}`);
  const text = fs.readFileSync(source, 'utf8');
  if (/PRIVATE KEY/.test(text)) throw new Error(`${source} must not contain key material`);
  const names = hosts(text);
  if (names.length === 0) throw new Error(`${source} defines no Host blocks`);
  // ssh -G parses the file and fails on unknown options without connecting.
  for (const name of names) execFileSync('ssh', ['-G', '-F', source, name], { stdio: 'ignore' });
  return names;
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

function relative(value: unknown): string {
  if (typeof value !== 'string' || path.isAbsolute(value) || value.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(`Unsafe relative path: ${value}`);
  }
  return value;
}

function stat(filename: string): fs.Stats | null {
  try { return fs.lstatSync(filename); }
  catch (error) { if (errorCode(error) === 'ENOENT') return null; throw error; }
}

function safeParents(filename: string, home: string): void {
  relative(path.relative(home, filename));
  for (let parent = path.dirname(filename); parent !== home; parent = path.dirname(parent)) {
    const info = stat(parent);
    if (info && !info.isDirectory()) throw new Error(`Parent must be a real directory: ${parent}`);
  }
}

// The Include must come before any Host or Match line, or it only applies inside that block.
function includedFirst(text: string): boolean {
  const first = text.split('\n').map(line => line.trim()).find(line => line && !line.startsWith('#'));
  return first === INCLUDE;
}

export function install(root: string, home: string, { apply = false, log = console.log, link = fs.symlinkSync }: InstallOptions = {}): Action[] {
  root = fs.realpathSync(root);
  home = fs.realpathSync(home);
  if (!fs.statSync(home).isDirectory()) throw new Error('--home must be an existing directory');
  const names = verify(root);
  const source = path.join(root, SOURCE);
  const linkDest = path.join(home, LINK);
  const configDest = path.join(home, CONFIG);
  safeParents(linkDest, home);
  safeParents(configDest, home);

  const linkInfo = stat(linkDest);
  let same = false;
  if (linkInfo?.isSymbolicLink()) {
    try { same = fs.realpathSync(linkDest) === fs.realpathSync(source); }
    catch (error) { if (!['ENOENT', 'ELOOP'].includes(errorCode(error) ?? '')) throw error; }
  }
  const configInfo = stat(configDest);
  if (configInfo && !configInfo.isFile()) throw new Error(`${configDest} must be a regular file`);
  const config = configInfo ? fs.readFileSync(configDest, 'utf8') : '';
  const actions: Action[] = [
    { status: same ? 'ok' : linkInfo ? 'replace' : 'create', source, dest: linkDest },
    { status: includedFirst(config) ? 'ok' : configInfo ? 'update' : 'create', source: INCLUDE, dest: configDest },
  ];

  const backupRoot = path.join(home, '.local/state/dotfiles/backups', randomUUID().replaceAll('-', ''));
  // Validate all destination and backup parents before the first write.
  for (const { dest } of actions) safeParents(path.join(backupRoot, path.relative(home, dest)), home);
  const backupOf = (dest: string) => {
    const backup = path.join(backupRoot, path.relative(home, dest));
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    return backup;
  };

  const [linkAction, configAction] = actions as [Action, Action];
  log(`${linkAction.status.padEnd(7)} ${linkDest} -> ${source}`);
  if (apply && linkAction.status !== 'ok') {
    let backup: string | undefined;
    fs.mkdirSync(path.dirname(linkDest), { recursive: true, mode: 0o700 });
    if (linkAction.status === 'replace') {
      backup = backupOf(linkDest);
      fs.renameSync(linkDest, backup);
      log(`backup  ${backup}`);
    }
    try { link(source, linkDest, 'file'); }
    catch (error) {
      if (backup) fs.renameSync(backup, linkDest);
      throw error;
    }
  }

  log(`${configAction.status.padEnd(7)} ${configDest} <- ${INCLUDE}`);
  if (apply && configAction.status !== 'ok') {
    const mode = configInfo ? configInfo.mode & 0o777 : 0o600;
    if (configInfo) {
      const backup = backupOf(configDest);
      fs.copyFileSync(configDest, backup);
      log(`backup  ${backup}`);
    }
    // Write beside the config and rename over it, so a failed write leaves the original intact.
    const temp = `${configDest}.dotfiles-${randomUUID()}`;
    fs.writeFileSync(temp, `# Added by ~/.dotfiles (pnpm run ssh install). Keep it above every Host block.\n${INCLUDE}\n\n${config}`, { mode, flag: 'wx' });
    fs.renameSync(temp, configDest);
  }

  const duplicates = hosts(config).filter(name => names.includes(name));
  if (duplicates.length > 0) {
    log(`warn    ${configDest} also defines ${duplicates.join(', ')}. The included copy wins; remove the duplicate blocks by hand.`);
  }
  return actions;
}

export function main(args = process.argv.slice(2)): number {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
      apply: { type: 'boolean', default: false }, home: { type: 'string', default: homedir() }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
      console.log('Usage: pnpm run ssh <check|install> [--apply] [--home PATH]\nPreview unless --apply. --home selects an existing alternate home for testing.');
      return 0;
    }
    if (positionals.length !== 1 || !['check', 'install'].includes(positionals[0] ?? '')) throw new Error('Expected check or install. Use --help for usage.');
    if (positionals[0] === 'check') {
      if (values.apply) throw new Error('--apply is only valid with install');
      const names = verify();
      console.log(`Verified SSH hosts: ${names.join(', ')}.`);
    } else {
      if (process.platform !== 'darwin') throw new Error('This installer is scoped to macOS');
      install(ROOT, path.resolve(values.home), { apply: values.apply });
      if (!values.apply) console.log('Preview only. Add --apply to write these changes.');
    }
    return 0;
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
