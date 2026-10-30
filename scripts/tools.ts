import * as fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BREWFILE = 'tools/Brewfile';
const APPS = 'tools/Brewfile.apps';
const GLOBALS = 'tools/pnpm-globals';

export interface Brewfile {
  taps: string[];
  formulae: string[];
  casks: string[];
  mas: string[];
}

export interface PnpmSpec {
  name: string;
  version?: string;
}

export interface Installed {
  taps: string[];
  // Everything installed, and the subset nothing else depends on.
  formulae: string[];
  leaves: string[];
  casks: string[];
  pnpm: Record<string, string>;
}

const LINE = /^(tap|brew|cask) "([^"]+)"(, trusted: true)?$|^mas "([^"]+)", id: \d+$/;

export function parseBrewfile(text: string, file = 'Brewfile'): Brewfile {
  const parsed: Brewfile = { taps: [], formulae: [], casks: [], mas: [] };
  const seen = new Set<string>();
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const match = LINE.exec(line);
    if (!match) throw new Error(`${file}:${index + 1} is not a tap, brew, cask, or mas line: ${line}`);
    const [, kind, name, trusted, app] = match;
    const key = `${kind ?? 'mas'} ${name ?? app}`;
    if (seen.has(key)) throw new Error(`${file}:${index + 1} repeats ${key}`);
    seen.add(key);
    if (app) parsed.mas.push(app);
    else if (kind === 'tap') parsed.taps.push(name ?? '');
    else {
      const full = name ?? '';
      const tap = full.split('/').slice(0, 2).join('/');
      const remote = full.includes('/');
      if (remote && !trusted) throw new Error(`${file}:${index + 1} needs trusted: true for ${full}`);
      if (!remote && trusted) throw new Error(`${file}:${index + 1} trusts ${full}, which isn't from a third-party tap`);
      if (remote && !parsed.taps.includes(tap)) throw new Error(`${file}:${index + 1} uses ${full} without tap "${tap}" above it`);
      (kind === 'brew' ? parsed.formulae : parsed.casks).push(full);
    }
  });
  return parsed;
}

export function parseGlobals(text: string): PnpmSpec[] {
  const seen = new Set<string>();
  return text.split('\n').filter(Boolean).map(line => {
    const match = /^(@?[^@\s]+)(?:@(\S+))?$/.exec(line);
    if (!match?.[1]) throw new Error(`${GLOBALS} has an invalid spec: ${line}`);
    if (seen.has(match[1])) throw new Error(`${GLOBALS} repeats ${match[1]}`);
    seen.add(match[1]);
    return { name: match[1], ...(match[2] ? { version: match[2].replace(/^runtime:/, '') } : {}) };
  });
}

export function verify(root = ROOT): void {
  parseBrewfile(fs.readFileSync(path.join(root, BREWFILE), 'utf8'), BREWFILE);
  parseBrewfile(fs.readFileSync(path.join(root, APPS), 'utf8'), APPS);
  parseGlobals(fs.readFileSync(path.join(root, GLOBALS), 'utf8'));
}

export function compare(brewfile: Brewfile, globals: PnpmSpec[], installed: Installed): string[] {
  const report: string[] = [];
  const missing = (kind: string, listed: string[], present: string[]) => {
    for (const name of listed) if (!present.includes(name)) report.push(`missing   ${kind} ${name}`);
  };
  const untracked = (kind: string, present: string[], listed: string[]) => {
    for (const name of present) if (!listed.includes(name)) report.push(`untracked ${kind} ${name}`);
  };
  missing('tap', brewfile.taps, installed.taps);
  missing('formula', brewfile.formulae, installed.formulae);
  missing('cask', brewfile.casks, installed.casks);
  missing('pnpm', globals.map(spec => spec.name), Object.keys(installed.pnpm));
  untracked('tap', installed.taps, brewfile.taps);
  untracked('formula', installed.leaves, brewfile.formulae);
  untracked('cask', installed.casks, brewfile.casks);
  untracked('pnpm', Object.keys(installed.pnpm), globals.map(spec => spec.name));
  for (const { name, version } of globals) {
    const current = installed.pnpm[name];
    if (version && current && current !== version) report.push(`drift     pnpm ${name} is ${current}, ${GLOBALS} pins ${version}`);
  }
  return report;
}

function lines(command: string, args: string[]): string[] {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
}

function pnpmGlobals(): Record<string, string> {
  const data: unknown = JSON.parse(execFileSync('pnpm', ['ls', '-g', '--depth', '0', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const first: unknown = Array.isArray(data) ? data[0] : undefined;
  const dependencies = typeof first === 'object' && first !== null && 'dependencies' in first ? first.dependencies : {};
  if (typeof dependencies !== 'object' || dependencies === null) throw new Error('Unexpected output from pnpm ls');
  const found: Record<string, string> = {};
  for (const [name, value] of Object.entries(dependencies)) {
    found[name] = typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string' ? value.version : '';
  }
  return found;
}

export function status(root = ROOT, log: (message: string) => void = console.log): string[] {
  verify(root);
  const report = compare(
    parseBrewfile(fs.readFileSync(path.join(root, BREWFILE), 'utf8'), BREWFILE),
    parseGlobals(fs.readFileSync(path.join(root, GLOBALS), 'utf8')),
    {
      taps: lines('brew', ['tap']),
      formulae: lines('brew', ['list', '--formula', '--full-name']),
      leaves: lines('brew', ['leaves', '--installed-on-request']),
      casks: lines('brew', ['list', '--cask', '--full-name']),
      pnpm: pnpmGlobals(),
    },
  );
  for (const line of report) log(line);
  if (report.length === 0) log('Installed tools match the lists.');
  return report;
}

export function main(args = process.argv.slice(2)): number {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { help: { type: 'boolean', short: 'h' } } });
    if (values.help) {
      console.log('Usage: pnpm run tools <check|status>\ncheck validates the lists. status compares them with what is installed.');
      return 0;
    }
    if (positionals.length !== 1 || !['check', 'status'].includes(positionals[0] ?? '')) throw new Error('Expected check or status. Use --help for usage.');
    if (positionals[0] === 'status') status();
    else {
      verify();
      console.log('Verified tool lists.');
    }
    return 0;
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
