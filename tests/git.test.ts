import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { ROOT, install, verify, type InstallOptions } from '../scripts/git.ts';

function fixture(t: TestContext) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-git-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  const root = path.join(temp, 'repo');
  fs.mkdirSync(home);
  fs.cpSync(path.join(ROOT, 'git'), path.join(root, 'git'), { recursive: true });
  const run = (options: InstallOptions = {}) => install(root, home, { apply: true, log: () => {}, ...options });
  return { home, root, run, dest: path.join(home, '.gitconfig'), source: path.join(root, 'git/gitconfig') };
}

test('git check accepts the tracked config', () => {
  verify(ROOT);
});

test('git check rejects a broken config and literal home paths', t => {
  const { root, source } = fixture(t);
  fs.writeFileSync(source, '[user\n');
  assert.throws(() => verify(root));
  fs.writeFileSync(source, '[core]\n\texcludesfile = /Users/someone/.gitignore\n');
  assert.throws(() => verify(root), /\/Users\//);
});

test('git preview writes nothing; restore links the config and is repeatable', t => {
  const { home, dest, source, run } = fixture(t);
  assert.equal(run({ apply: false }).status, 'create');
  assert.deepEqual(fs.readdirSync(home), []);
  assert.equal(run().status, 'create');
  assert.ok(fs.lstatSync(dest).isSymbolicLink());
  assert.equal(fs.readFileSync(dest, 'utf8'), fs.readFileSync(source, 'utf8'));
  assert.equal(run().status, 'ok');
  assert.deepEqual(fs.readdirSync(home), ['.gitconfig']);
});

test('git restore backs up an existing file', t => {
  const { home, dest, run } = fixture(t);
  fs.writeFileSync(dest, 'personal config');
  assert.equal(run().status, 'replace');
  const backups = path.join(home, '.local/state/dotfiles/backups');
  const [runId] = fs.readdirSync(backups);
  assert.ok(runId);
  assert.equal(fs.readFileSync(path.join(backups, runId, '.gitconfig'), 'utf8'), 'personal config');
});

test('git link failure restores the original file', t => {
  const { dest, run } = fixture(t);
  fs.writeFileSync(dest, 'original');
  assert.throws(() => run({ link: () => { throw new Error('link failed'); } }), /link failed/);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'original');
});

test('git config --global writes through the link into the checkout', t => {
  const { home, source, run } = fixture(t);
  run();
  execFileSync('git', ['config', '--global', 'test.value', 'yes'], { env: { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config') } });
  assert.match(fs.readFileSync(source, 'utf8'), /value = yes/);
  assert.ok(fs.lstatSync(path.join(home, '.gitconfig')).isSymbolicLink());
});
