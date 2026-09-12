#!/usr/bin/env node
import * as fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function relative(value) {
  if (typeof value !== 'string' || path.isAbsolute(value) || value.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(`Unsafe relative path: ${value}`);
  }
  return value;
}

function stat(filename) {
  try { return fs.lstatSync(filename); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function files(directory, prefix = '') {
  const entry = fs.lstatSync(directory);
  if (entry.isSymbolicLink()) throw new Error(`Unexpected vendored symlink: ${directory}`);
  if (!entry.isDirectory()) throw new Error(`Expected directory: ${directory}`);
  return fs.readdirSync(directory).flatMap(name => {
    const filename = path.join(directory, name);
    const rel = prefix + name;
    const info = fs.lstatSync(filename);
    if (info.isSymbolicLink()) throw new Error(`Unexpected vendored symlink: ${filename}`);
    if (info.isDirectory()) return files(filename, `${rel}/`);
    if (!info.isFile()) throw new Error(`Unexpected vendored file: ${filename}`);
    return [rel];
  });
}

export function verify(root = ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'skills/manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.profile !== 'personal-macos') throw new Error('Unsupported manifest version or profile');
  const names = new Set();
  for (const skill of manifest.skills) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) || names.has(skill.name)) throw new Error(`Invalid or duplicate skill: ${skill.name}`);
    names.add(skill.name);
    if (!/^[a-f0-9]{40}$/.test(skill.commit)) throw new Error(`Missing commit pin: ${skill.name}`);
    if (!skill.license || !stat(path.join(root, relative(skill.license_file)))?.isFile()) throw new Error(`Missing license: ${skill.name}`);
    const source = path.join(root, 'skills/vendor', skill.name);
    const expected = Object.keys(skill.files).sort();
    if (!expected.includes('SKILL.md') || JSON.stringify(files(source).sort()) !== JSON.stringify(expected)) throw new Error(`File inventory differs: ${skill.name}`);
    for (const [filename, digest] of Object.entries(skill.files)) {
      const data = fs.readFileSync(path.join(source, relative(filename)));
      if (createHash('sha256').update(data).digest('hex') !== digest) throw new Error(`Content differs: ${skill.name}/${filename}`);
    }
  }
  if (!Array.isArray(manifest.targets) || !manifest.targets.length || new Set(manifest.targets).size !== manifest.targets.length) throw new Error('Missing or duplicate targets');
  manifest.targets.forEach(relative);
  return manifest;
}

function safeParents(filename, home) {
  relative(path.relative(home, filename));
  for (let parent = path.dirname(filename); parent !== home; parent = path.dirname(parent)) {
    const info = stat(parent);
    if (info && !info.isDirectory()) throw new Error(`Parent must be a real directory: ${parent}`);
  }
}

export function install(root, home, { apply = false, log = console.log, link = fs.symlinkSync } = {}) {
  root = fs.realpathSync(root);
  home = fs.realpathSync(home);
  if (!fs.statSync(home).isDirectory()) throw new Error('--home must be an existing directory');
  const manifest = verify(root);
  const actions = manifest.targets.flatMap(target => manifest.skills.map(skill => {
    const source = path.join(root, 'skills/vendor', skill.name);
    const dest = path.join(home, target, skill.name);
    safeParents(dest, home);
    const info = stat(dest);
    let same = false;
    if (info?.isSymbolicLink()) {
      try { same = fs.realpathSync(dest) === fs.realpathSync(source); }
      catch (error) { if (!['ENOENT', 'ELOOP'].includes(error.code)) throw error; }
    }
    return { status: same ? 'ok' : info ? 'replace' : 'create', source, dest };
  }));
  const backupRoot = path.join(home, '.local/state/dotfiles/backups', randomUUID().replaceAll('-', ''));
  // Validate all destination and backup parents before the first write.
  for (const { dest } of actions) safeParents(path.join(backupRoot, path.relative(home, dest)), home);
  for (const { status, source, dest } of actions) {
    log(`${status.padEnd(7)} ${dest} -> ${source}`);
    if (!apply || status === 'ok') continue;
    let backup;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (status === 'replace') {
      backup = path.join(backupRoot, path.relative(home, dest));
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.renameSync(dest, backup);
      log(`backup  ${backup}`);
    }
    try { link(source, dest, 'dir'); }
    catch (error) {
      if (backup) fs.renameSync(backup, dest);
      throw error;
    }
  }
  return actions;
}

export function main(args = process.argv.slice(2)) {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
      apply: { type: 'boolean', default: false }, home: { type: 'string', default: homedir() }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
      console.log('Usage: node scripts/skills.mjs <check|install> [--apply] [--home PATH]\nPreview unless --apply. --home selects an existing alternate home for testing.');
      return 0;
    }
    if (positionals.length !== 1 || !['check', 'install'].includes(positionals[0])) throw new Error('Expected check or install. Use --help for usage.');
    if (positionals[0] === 'check') {
      if (values.apply) throw new Error('--apply is only valid with install');
      console.log(`Verified ${verify().skills.length} pinned skills and licensing metadata.`);
    } else {
      if (process.platform !== 'darwin') throw new Error('This installer is scoped to macOS');
      install(ROOT, path.resolve(values.home), { apply: values.apply });
      if (!values.apply) console.log('Preview only. Add --apply to write these changes.');
    }
    return 0;
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
