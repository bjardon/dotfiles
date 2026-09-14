import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  ['AGENTS.md', '.codex/AGENTS.md'],
  ['AGENTS.md', '.agents/AGENTS.md'],
  ['CLAUDE.md', '.claude/CLAUDE.md'],
] as const;

export interface Action {
  status: 'ok' | 'replace' | 'create';
  source: string;
  dest: string;
}

export interface InstallOptions {
  apply?: boolean;
  log?: (message: string) => void;
  link?: (source: string, dest: string, type: 'file') => void;
}

export function verify(root = ROOT): void {
  for (const [name] of targets) {
    const source = path.join(root, 'agents', name);
    if (!fs.statSync(source).isFile()) throw new Error(`Expected instruction file: ${source}`);
    fs.readFileSync(source, 'utf8');
  }
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

export function install(root: string, home: string, { apply = false, log = console.log, link = fs.symlinkSync }: InstallOptions = {}): Action[] {
  root = fs.realpathSync(root);
  home = fs.realpathSync(home);
  if (!fs.statSync(home).isDirectory()) throw new Error('--home must be an existing directory');
  verify(root);
  const actions = targets.map(([name, target]): Action => {
    const source = path.join(root, 'agents', name);
    const dest = path.join(home, target);
    safeParents(dest, home);
    const info = stat(dest);
    let same = false;
    if (info?.isSymbolicLink()) {
      try { same = fs.realpathSync(dest) === fs.realpathSync(source); }
      catch (error) { if (!['ENOENT', 'ELOOP'].includes(errorCode(error) ?? '')) throw error; }
    }
    return { status: same ? 'ok' : info ? 'replace' : 'create', source, dest };
  });
  const backupRoot = path.join(home, '.local/state/dotfiles/backups', randomUUID().replaceAll('-', ''));
  // Validate all destination and backup parents before the first write.
  for (const { dest } of actions) safeParents(path.join(backupRoot, path.relative(home, dest)), home);
  for (const { status, source, dest } of actions) {
    log(`${status.padEnd(7)} ${dest} -> ${source}`);
    if (!apply || status === 'ok') continue;
    let backup: string | undefined;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (status === 'replace') {
      backup = path.join(backupRoot, path.relative(home, dest));
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.renameSync(dest, backup);
      log(`backup  ${backup}`);
    }
    try { link(source, dest, 'file'); }
    catch (error) {
      if (backup) fs.renameSync(backup, dest);
      throw error;
    }
  }
  return actions;
}

export function main(args = process.argv.slice(2)): number {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
      apply: { type: 'boolean', default: false }, home: { type: 'string', default: homedir() }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
      console.log('Usage: npm run agents -- <check|install> [--apply] [--home PATH]\nPreview unless --apply. --home selects an existing alternate home for testing.');
      return 0;
    }
    if (positionals.length !== 1 || !['check', 'install'].includes(positionals[0] ?? '')) throw new Error('Expected check or install. Use --help for usage.');
    if (positionals[0] === 'check') {
      if (values.apply) throw new Error('--apply is only valid with install');
      verify();
      console.log('Verified global agent instruction files.');
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
