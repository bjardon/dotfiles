import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT, install, type InstallOptions } from '../scripts/agents.ts';

function fixture(t: TestContext) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-agents-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  const root = path.join(temp, 'repo');
  fs.mkdirSync(home);
  fs.cpSync(path.join(ROOT, 'agents'), path.join(root, 'agents'), { recursive: true });
  const run = (options: InstallOptions = {}) => install(root, home, { apply: true, log: () => {}, ...options });
  return { temp, home, root, run };
}

test('agent preview writes nothing; restore links both files and is repeatable', t => {
  const { home, root, run } = fixture(t);
  assert.equal(run({ apply: false }).length, 3);
  assert.deepEqual(fs.readdirSync(home), []);
  const actions = run();
  for (const action of actions) {
    assert.ok(fs.lstatSync(action.dest).isSymbolicLink());
    assert.equal(fs.readFileSync(action.dest, 'utf8'), fs.readFileSync(action.source, 'utf8'));
  }
  assert.equal(fs.realpathSync(path.join(home, '.agents/AGENTS.md')),
    fs.realpathSync(path.join(home, '.codex/AGENTS.md')));
  assert.match(fs.readFileSync(path.join(home, '.claude/CLAUDE.md'), 'utf8'),
    /^@~\/\.agents\/AGENTS\.md\n/);
  fs.appendFileSync(path.join(root, 'agents/CLAUDE.md'), '\nA new preference.\n');
  assert.match(fs.readFileSync(path.join(home, '.claude/CLAUDE.md'), 'utf8'), /A new preference/);
  assert.ok(run().every(action => action.status === 'ok'));
  assert.equal(fs.existsSync(path.join(home, '.local')), false);
});

for (const kind of ['file', 'directory', 'broken link']) test(`agent restore backs up a ${kind}`, t => {
  const { home, run } = fixture(t);
  fs.mkdirSync(path.join(home, '.codex'));
  const dest = path.join(home, '.codex/AGENTS.md');
  if (kind === 'file') fs.writeFileSync(dest, 'personal instructions');
  else if (kind === 'directory') {
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'keep.txt'), 'keep');
  } else fs.symlinkSync('/missing-agent-instructions', dest);
  run();
  const backups = path.join(home, '.local/state/dotfiles/backups');
  const [runId] = fs.readdirSync(backups);
  assert.ok(runId);
  const backup = path.join(backups, runId, '.codex/AGENTS.md');
  fs.unlinkSync(dest);
  fs.renameSync(backup, dest);
  if (kind === 'file') assert.equal(fs.readFileSync(dest, 'utf8'), 'personal instructions');
  else if (kind === 'directory') assert.equal(fs.readFileSync(path.join(dest, 'keep.txt'), 'utf8'), 'keep');
  else assert.equal(fs.readlinkSync(dest), '/missing-agent-instructions');
});

test('agent link failure restores the original file', t => {
  const { home, run } = fixture(t);
  fs.mkdirSync(path.join(home, '.codex'));
  const dest = path.join(home, '.codex/AGENTS.md');
  fs.writeFileSync(dest, 'original');
  assert.throws(() => run({ link: () => { throw new Error('link failed'); } }), /link failed/);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'original');
});

for (const directory of ['.agents', '.claude', '.local']) test(`agent restore rejects linked ${directory} before writing`, t => {
  const { temp, home, run } = fixture(t);
  const outside = path.join(temp, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(home, directory));
  assert.throws(() => run(), /real directory/);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(fs.existsSync(path.join(home, '.codex')), false);
});

test('agent restore validates both source files before writing', t => {
  const { root, home, run } = fixture(t);
  fs.unlinkSync(path.join(root, 'agents/CLAUDE.md'));
  assert.throws(() => run(), /ENOENT/);
  assert.deepEqual(fs.readdirSync(home), []);
});
