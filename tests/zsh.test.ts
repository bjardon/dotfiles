import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { ROOT, install, verify, type InstallOptions } from '../scripts/zsh.ts';

function fixture(t: TestContext) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-zsh-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  const root = path.join(temp, 'repo');
  fs.mkdirSync(home);
  fs.cpSync(path.join(ROOT, 'zsh'), path.join(root, 'zsh'), { recursive: true });
  const run = (options: InstallOptions = {}) => install(root, home, { apply: true, log: () => {}, ...options });
  return { temp, home, root, run };
}

test('zsh preview writes nothing; restore links all three files and is repeatable', t => {
  const { home, root, run } = fixture(t);
  assert.equal(run({ apply: false }).length, 3);
  assert.deepEqual(fs.readdirSync(home), []);
  const actions = run();
  for (const action of actions) {
    assert.ok(fs.lstatSync(action.dest).isSymbolicLink());
    assert.equal(fs.readFileSync(action.dest, 'utf8'), fs.readFileSync(action.source, 'utf8'));
  }
  assert.deepEqual(fs.readdirSync(home).sort(), ['.zprofile', '.zshenv', '.zshrc']);
  fs.appendFileSync(path.join(root, 'zsh/zshrc'), '\nalias added=true\n');
  assert.match(fs.readFileSync(path.join(home, '.zshrc'), 'utf8'), /alias added=true/);
  assert.ok(run().every(action => action.status === 'ok'));
  assert.equal(fs.existsSync(path.join(home, '.local')), false);
});

for (const kind of ['file', 'directory', 'broken link']) test(`zsh restore backs up a ${kind}`, t => {
  const { home, run } = fixture(t);
  const dest = path.join(home, '.zshrc');
  if (kind === 'file') fs.writeFileSync(dest, 'personal config');
  else if (kind === 'directory') {
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'keep.txt'), 'keep');
  } else fs.symlinkSync('/missing-zshrc', dest);
  run();
  const backups = path.join(home, '.local/state/dotfiles/backups');
  const [runId] = fs.readdirSync(backups);
  assert.ok(runId);
  const backup = path.join(backups, runId, '.zshrc');
  fs.unlinkSync(dest);
  fs.renameSync(backup, dest);
  if (kind === 'file') assert.equal(fs.readFileSync(dest, 'utf8'), 'personal config');
  else if (kind === 'directory') assert.equal(fs.readFileSync(path.join(dest, 'keep.txt'), 'utf8'), 'keep');
  else assert.equal(fs.readlinkSync(dest), '/missing-zshrc');
});

test('zsh link failure restores the original file', t => {
  const { home, run } = fixture(t);
  const dest = path.join(home, '.zshenv');
  fs.writeFileSync(dest, 'original');
  assert.throws(() => run({ link: () => { throw new Error('link failed'); } }), /link failed/);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'original');
});

test('zsh link failure on a later file rolls back the earlier links', t => {
  const { home, run } = fixture(t);
  fs.writeFileSync(path.join(home, '.zshenv'), 'original env');
  let calls = 0;
  const link = (source: string, dest: string, type: 'file') => {
    if (++calls === 3) throw new Error('link failed');
    fs.symlinkSync(source, dest, type);
  };
  assert.throws(() => run({ link }), /link failed/);
  assert.equal(fs.readFileSync(path.join(home, '.zshenv'), 'utf8'), 'original env');
  assert.ok(!fs.lstatSync(path.join(home, '.zshenv')).isSymbolicLink());
  assert.equal(fs.existsSync(path.join(home, '.zprofile')), false);
  assert.equal(fs.existsSync(path.join(home, '.zshrc')), false);
});

test('zsh restore rejects a linked .local before writing', t => {
  const { temp, home, run } = fixture(t);
  const outside = path.join(temp, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(home, '.local'));
  fs.writeFileSync(path.join(home, '.zshrc'), 'personal config');
  assert.throws(() => run(), /real directory/);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(fs.readFileSync(path.join(home, '.zshrc'), 'utf8'), 'personal config');
});

test('zsh check rejects syntax errors and hardcoded home paths before writing', t => {
  const { root, home, run } = fixture(t);
  const zshrc = path.join(root, 'zsh/zshrc');
  const original = fs.readFileSync(zshrc, 'utf8');
  fs.appendFileSync(zshrc, '\nif [[ -n "$HOME" ]]; then\n');
  assert.throws(() => verify(root));
  assert.throws(() => run());
  fs.writeFileSync(zshrc, `${original}\nexport PATH="/Users/someone/bin:$PATH"\n`);
  assert.throws(() => verify(root), /\$HOME/);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('zsh restore validates all source files before writing', t => {
  const { root, home, run } = fixture(t);
  fs.unlinkSync(path.join(root, 'zsh/zprofile'));
  assert.throws(() => run(), /ENOENT/);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('zsh restore reports Oh My Zsh missing, matching, or drifted from the pin', t => {
  const { root, home, run } = fixture(t);
  const messages: string[] = [];
  const log = (message: string) => { messages.push(message); };
  run({ apply: false, log });
  assert.ok(messages.some(message => message.startsWith('missing') && message.includes('.oh-my-zsh')));

  const omz = path.join(home, '.oh-my-zsh');
  const git = (...args: string[]) => execFileSync('git', ['-C', omz, '-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], { encoding: 'utf8' }).trim();
  fs.mkdirSync(omz);
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'pinned');
  fs.writeFileSync(path.join(root, 'zsh/oh-my-zsh-commit'), `${git('rev-parse', 'HEAD')}\n`);
  messages.length = 0;
  run({ apply: false, log });
  assert.ok(!messages.some(message => /^(missing|drift)/.test(message)));

  git('commit', '-q', '--allow-empty', '-m', 'updated');
  messages.length = 0;
  run({ apply: false, log });
  assert.ok(messages.some(message => message.startsWith('drift')));
});

test('zsh restore treats a non-Git ~/.oh-my-zsh as drift and still links', t => {
  const { home, run } = fixture(t);
  fs.mkdirSync(path.join(home, '.oh-my-zsh'));
  const messages: string[] = [];
  const actions = run({ log: message => { messages.push(message); } });
  assert.ok(messages.some(message => message.startsWith('drift') && message.includes('not a Git checkout')));
  assert.ok(actions.every(action => fs.lstatSync(action.dest).isSymbolicLink()));
});

test('zsh check rejects a malformed Oh My Zsh pin', t => {
  const { root } = fixture(t);
  fs.writeFileSync(path.join(root, 'zsh/oh-my-zsh-commit'), 'master\n');
  assert.throws(() => verify(root), /full commit hash/);
});
