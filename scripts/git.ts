import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'git/gitconfig';
const LINK = '.gitconfig';

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
  const source = path.join(root, SOURCE);
  if (!fs.statSync(source).isFile()) throw new Error(`Expected Git config: ${source}`);
  // A literal home path only works for one username.
  if (/\/Users\//.test(fs.readFileSync(source, 'utf8'))) throw new Error(`${source} must not contain /Users/ paths`);
  execFileSync('git', ['config', '--file', source, '--list'], { stdio: 'ignore' });
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

function stat(filename: string): fs.Stats | null {
  try { return fs.lstatSync(filename); }
  catch (error) { if (errorCode(error) === 'ENOENT') return null; throw error; }
}

export function install(root: string, home: string, { apply = false, log = console.log, link = fs.symlinkSync }: InstallOptions = {}): Action {
  root = fs.realpathSync(root);
  home = fs.realpathSync(home);
  if (!fs.statSync(home).isDirectory()) throw new Error('--home must be an existing directory');
  verify(root);
  const source = path.join(root, SOURCE);
  const dest = path.join(home, LINK);
  const info = stat(dest);
  let same = false;
  if (info?.isSymbolicLink()) {
    try { same = fs.realpathSync(dest) === source; }
    catch (error) { if (!['ENOENT', 'ELOOP'].includes(errorCode(error) ?? '')) throw error; }
  }
  const action: Action = { status: same ? 'ok' : info ? 'replace' : 'create', source, dest };
  log(`${action.status.padEnd(7)} ${dest} -> ${source}`);
  if (!apply || action.status === 'ok') return action;
  let backup: string | undefined;
  if (action.status === 'replace') {
    backup = path.join(home, '.local/state/dotfiles/backups', randomUUID().replaceAll('-', ''), LINK);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.renameSync(dest, backup);
    log(`backup  ${backup}`);
  }
  try { link(source, dest, 'file'); }
  catch (error) {
    if (backup) fs.renameSync(backup, dest);
    throw error;
  }
  return action;
}

export function main(args = process.argv.slice(2)): number {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
      apply: { type: 'boolean', default: false }, home: { type: 'string', default: homedir() }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
      console.log('Usage: pnpm run git <check|install> [--apply] [--home PATH]\nPreview unless --apply. --home selects an existing alternate home for testing.');
      return 0;
    }
    if (positionals.length !== 1 || !['check', 'install'].includes(positionals[0] ?? '')) throw new Error('Expected check or install. Use --help for usage.');
    if (positionals[0] === 'check') {
      if (values.apply) throw new Error('--apply is only valid with install');
      verify();
      console.log('Verified Git config.');
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
