import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, verify, install } from '../scripts/skills.mjs';

function fixture(t) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  const root = path.join(temp, 'repo');
  fs.mkdirSync(home);
  fs.cpSync(path.join(ROOT, 'skills'), path.join(root, 'skills'), { recursive: true });
  const run = (options = {}) => install(root, home, { apply: true, log: () => {}, ...options });
  return { temp, home, root, run };
}

 test('preview writes nothing', t => {
  const { home, root, run } = fixture(t);
  const manifest = verify(root);
  assert.equal(run({ apply: false }).length, manifest.skills.length * manifest.targets.length);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('clean restore, supporting files, and repeated apply', t => {
  const { home, root, run } = fixture(t);
  run();
  const manifest = verify(root);
  for (const target of manifest.targets) {
    for (const skill of manifest.skills) {
      for (const file of Object.keys(skill.files)) {
        assert.deepEqual(fs.readFileSync(path.join(home, target, skill.name, file)), fs.readFileSync(path.join(root, 'skills/vendor', skill.name, file)));
      }
    }
    assert.ok(fs.existsSync(path.join(home, target, 'grill/../write-adr/ADR-FORMAT.md')));
  }
  assert.ok(run().every(a => a.status === 'ok'));
  assert.equal(fs.existsSync(path.join(home, '.local')), false);
});

test('back up directories, files, and broken links; preserve unselected skills; recover', t => {
  const { home, run } = fixture(t);
  const parent = path.join(home, '.agents/skills');
  fs.mkdirSync(path.join(parent, 'bro'), { recursive: true });
  fs.writeFileSync(path.join(parent, 'bro/local.txt'), 'my edits');
  fs.writeFileSync(path.join(parent, 'how'), 'existing file');
  fs.symlinkSync('../../missing', path.join(parent, 'why'));
  fs.mkdirSync(path.join(parent, 'gh-cli'));
  fs.writeFileSync(path.join(parent, 'gh-cli/SKILL.md'), 'unselected');
  run();
  const backups = path.join(home, '.local/state/dotfiles/backups');
  const backup = path.join(backups, fs.readdirSync(backups)[0], '.agents/skills');
  assert.equal(fs.readFileSync(path.join(backup, 'bro/local.txt'), 'utf8'), 'my edits');
  assert.equal(fs.readFileSync(path.join(backup, 'how'), 'utf8'), 'existing file');
  assert.equal(fs.readlinkSync(path.join(backup, 'why')), '../../missing');
  assert.equal(fs.readFileSync(path.join(parent, 'gh-cli/SKILL.md'), 'utf8'), 'unselected');
  fs.unlinkSync(path.join(parent, 'bro'));
  fs.renameSync(path.join(backup, 'bro'), path.join(parent, 'bro'));
  assert.equal(fs.readFileSync(path.join(parent, 'bro/local.txt'), 'utf8'), 'my edits');
});

test('failed link restores original', t => {
  const { home, run } = fixture(t);
  const parent = path.join(home, '.agents/skills');
  fs.mkdirSync(parent, { recursive: true });
  const original = path.join(parent, 'blast-radius');
  fs.writeFileSync(original, 'preserve me');
  assert.throws(() => run({ link: () => { throw new Error('failed'); } }), /failed/);
  assert.equal(fs.readFileSync(original, 'utf8'), 'preserve me');
});

for (const kind of ['modified', 'missing', 'symlink']) test(`reject ${kind} vendor before writes`, t => {
  const { home, root, run } = fixture(t);
  const file = path.join(root, 'skills/vendor/bro/SKILL.md');
  if (kind === 'modified') fs.writeFileSync(file, 'modified');
  else {
    fs.unlinkSync(file);
    if (kind === 'symlink') fs.symlinkSync('/missing', file);
  }
  assert.throws(() => run(), /Content differs|inventory differs|vendored symlink/);
  assert.deepEqual(fs.readdirSync(home), []);
});

for (const directory of ['.claude', '.local']) test(`reject linked ${directory} parent before writes`, t => {
  const { home, temp, run } = fixture(t);
  const outside = path.join(temp, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(home, directory));
  assert.throws(() => run(), /real directory/);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(fs.existsSync(path.join(home, '.agents')), false);
});

test('reject traversal', t => {
  const { home, root, run } = fixture(t);
  const file = path.join(root, 'skills/manifest.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.targets = ['../escape'];
  fs.writeFileSync(file, JSON.stringify(data));
  assert.throws(() => run(), /Unsafe relative path/);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('CLI rejects bad arguments and checks the repository', () => {
  for (const args of [[], ['check', '--apply'], ['install', '--typo'], ['install', 'extra']]) {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/skills.mjs'), ...args]);
    assert.equal(result.status, 1);
  }
  assert.equal(spawnSync(process.execPath, [path.join(ROOT, 'scripts/skills.mjs'), 'check']).status, 0);
});
