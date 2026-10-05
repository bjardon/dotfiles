import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT, INCLUDE, install, type InstallOptions } from '../scripts/ssh.ts';

function fixture(t: TestContext) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-ssh-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  const root = path.join(temp, 'repo');
  fs.mkdirSync(home);
  fs.cpSync(path.join(ROOT, 'ssh'), path.join(root, 'ssh'), { recursive: true });
  const messages: string[] = [];
  const run = (options: InstallOptions = {}) => install(root, home, { apply: true, log: m => messages.push(m), ...options });
  const config = path.join(home, '.ssh/config');
  const link = path.join(home, '.ssh/config.d/devbox.conf');
  return { temp, home, root, run, config, link, messages };
}

function backups(home: string): string {
  const dir = path.join(home, '.local/state/dotfiles/backups');
  const [runId] = fs.readdirSync(dir);
  assert.ok(runId);
  return path.join(dir, runId);
}

test('ssh preview writes nothing; restore creates the link and config and is repeatable', t => {
  const { home, root, run, config, link } = fixture(t);
  assert.equal(run({ apply: false }).length, 2);
  assert.deepEqual(fs.readdirSync(home), []);
  run();
  assert.ok(fs.lstatSync(link).isSymbolicLink());
  assert.equal(fs.realpathSync(link), path.join(root, 'ssh/devbox.conf'));
  assert.ok(fs.readFileSync(config, 'utf8').includes(`${INCLUDE}\n`));
  assert.equal(fs.statSync(config).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(home, '.ssh')).mode & 0o777, 0o700);
  assert.ok(run().every(action => action.status === 'ok'));
  assert.equal(fs.existsSync(path.join(home, '.local')), false);
});

test('ssh restore backs up the existing config and keeps its hosts below the include', t => {
  const { home, run, config, messages } = fixture(t);
  fs.mkdirSync(path.join(home, '.ssh'), { mode: 0o700 });
  const original = 'Host github.com\n  IdentityFile ~/.ssh/id_ed25519\n\nHost devbox\n  User old\n';
  fs.writeFileSync(config, original, { mode: 0o644 });
  run();
  assert.equal(fs.readFileSync(path.join(backups(home), '.ssh/config'), 'utf8'), original);
  const updated = fs.readFileSync(config, 'utf8');
  assert.ok(updated.indexOf(INCLUDE) < updated.indexOf('Host github.com'));
  assert.ok(updated.endsWith(original));
  assert.equal(fs.statSync(config).mode & 0o777, 0o644);
  assert.ok(messages.some(m => m.startsWith('warn') && m.includes('devbox') && !m.includes('oxpbox')));
});

test('ssh restore backs up an existing file at the link path', t => {
  const { home, run, link } = fixture(t);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.writeFileSync(link, 'Host devbox\n');
  run();
  assert.equal(fs.readFileSync(path.join(backups(home), '.ssh/config.d/devbox.conf'), 'utf8'), 'Host devbox\n');
});

test('ssh link failure restores the original file and leaves the config alone', t => {
  const { run, link, config } = fixture(t);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.writeFileSync(link, 'original');
  fs.writeFileSync(config, 'Host github.com\n');
  assert.throws(() => run({ link: () => { throw new Error('link failed'); } }), /link failed/);
  assert.equal(fs.readFileSync(link, 'utf8'), 'original');
  assert.equal(fs.readFileSync(config, 'utf8'), 'Host github.com\n');
});

test('ssh restore refuses a symlinked config before writing', t => {
  const { temp, home, run, config, link } = fixture(t);
  const outside = path.join(temp, 'outside-config');
  fs.writeFileSync(outside, 'Host github.com\n');
  fs.mkdirSync(path.join(home, '.ssh'));
  fs.symlinkSync(outside, config);
  assert.throws(() => run(), /regular file/);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'Host github.com\n');
  assert.equal(fs.existsSync(link), false);
});

test('ssh restore rejects a linked .ssh directory before writing', t => {
  const { temp, home, run } = fixture(t);
  const outside = path.join(temp, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(home, '.ssh'));
  assert.throws(() => run(), /real directory/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('ssh check rejects key material and unknown options', t => {
  const { root, run, home } = fixture(t);
  const source = path.join(root, 'ssh/devbox.conf');
  const original = fs.readFileSync(source, 'utf8');
  fs.writeFileSync(source, `${original}# -----BEGIN OPENSSH PRIVATE KEY-----\n`);
  assert.throws(() => run(), /key material/);
  fs.writeFileSync(source, `${original}  NotAnOption yes\n`);
  assert.throws(() => run());
  assert.deepEqual(fs.readdirSync(home), []);
});
