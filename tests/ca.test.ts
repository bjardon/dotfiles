import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { ROOT, STAMP, blocks, entries, install, readStamp, signature, status, type InstallOptions } from '../scripts/ca.ts';

// Certificate bodies are only hashed, never parsed, so any bytes work.
function cert(seed: string): { pem: string; sha256: string } {
  const der = createHash('sha512').update(seed).digest();
  const base64 = der.toString('base64');
  const hex = createHash('sha256').update(der).digest('hex').toUpperCase();
  return { pem: `-----BEGIN CERTIFICATE-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`, sha256: hex.match(/../g)?.join(':') ?? '' };
}

const good = cert('good');
const bad = cert('bad');
const other = cert('other');

function bundle(...certs: { name: string; pem: string }[]): string {
  return `# $OpenBSD: cert.pem $\n${certs.map(({ name, pem }) => `### ${name} Inc\n\n=== /CN=${name}\nCertificate:\n    Data:\n        Subject: CN=${name}\nSHA256 Fingerprint=xx\n${pem}\n`).join('\n')}`;
}

function fixture(t: TestContext) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dotfiles-ca-test-')));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  const root = path.join(temp, 'repo');
  const certFile = path.join(temp, 'etc/ssl/cert.pem');
  fs.mkdirSync(home);
  fs.mkdirSync(path.join(root, 'ca'), { recursive: true });
  fs.mkdirSync(path.dirname(certFile), { recursive: true });
  const list = [{ name: 'Bad Root', sha256: bad.sha256, advisory: 'https://example.com/bad', added: '2026-10-28' }];
  fs.writeFileSync(path.join(root, 'ca/distrusted.json'), JSON.stringify(list));
  const stock = bundle({ name: 'Good', pem: good.pem }, { name: 'Bad', pem: bad.pem }, { name: 'Other', pem: other.pem });
  fs.writeFileSync(certFile, stock);
  const messages: string[] = [];
  const write = (source: string, dest: string) => fs.copyFileSync(source, dest);
  const run = (options: InstallOptions = {}) => install(root, home, { apply: true, log: m => messages.push(m), cert: certFile, write, ...options });
  const check = () => status(root, home, { log: m => messages.push(m), cert: certFile });
  // macOS installs a new file, so the inode changes even when the text matches.
  const replace = (text: string) => { fs.rmSync(certFile); fs.writeFileSync(certFile, text); };
  return { home, root, certFile, stock, messages, run, check, replace };
}

function backupDir(home: string): string | undefined {
  const dir = path.join(home, '.local/state/dotfiles/backups');
  return fs.existsSync(dir) ? fs.readdirSync(dir)[0] : undefined;
}

test('ca check accepts the tracked list', () => {
  assert.ok(entries(ROOT).length > 0);
});

test('ca check rejects malformed entries', t => {
  const { root } = fixture(t);
  const file = path.join(root, 'ca/distrusted.json');
  const entry = { name: 'Bad Root', sha256: bad.sha256, advisory: 'https://example.com/bad', added: '2026-10-28' };
  for (const [value, pattern] of [
    [[{ ...entry, sha256: bad.sha256.toLowerCase() }], /fingerprint/],
    [[entry, { ...entry, name: 'Copy' }], /repeats/],
    [[{ ...entry, advisory: 'http://example.com' }], /https/],
    [[{ ...entry, added: 'yesterday' }], /YYYY-MM-DD/],
    [[{ ...entry, note: 'x' }], /unknown keys/],
  ] as const) {
    fs.writeFileSync(file, JSON.stringify(value));
    assert.throws(() => entries(root), pattern);
  }
});

test('ca preview writes nothing', t => {
  const { home, certFile, stock, run, messages } = fixture(t);
  const actions = run({ apply: false });
  assert.deepEqual(actions.map(a => a.status), ['remove']);
  assert.equal(fs.readFileSync(certFile, 'utf8'), stock);
  assert.deepEqual(fs.readdirSync(home), []);
  assert.ok(messages.some(m => m.startsWith('remove') && m.includes('Bad Root')));
});

test('ca install removes only the listed root, backs up, stamps, and repeats cleanly', t => {
  const { home, certFile, stock, run } = fixture(t);
  run();
  const text = fs.readFileSync(certFile, 'utf8');
  assert.deepEqual(blocks(text).map(b => b.sha256), [good.sha256, other.sha256]);
  assert.ok(!text.includes('=== /CN=Bad'));
  assert.ok(text.includes('### Bad Inc'));
  assert.ok(text.includes('=== /CN=Other'));
  const runId = backupDir(home);
  assert.ok(runId);
  assert.equal(fs.readFileSync(path.join(home, '.local/state/dotfiles/backups', runId, path.relative('/', certFile)), 'utf8'), stock);
  assert.equal(readStamp(home)?.signature, signature(certFile));

  assert.deepEqual(run().map(a => a.status), ['ok']);
  assert.equal(fs.readdirSync(path.join(home, '.local/state/dotfiles/backups')).length, 1);
});

test('ca install refuses a write that does not land', t => {
  const { home, certFile, stock, run } = fixture(t);
  assert.throws(() => run({ write: () => {} }), /does not match/);
  assert.equal(fs.readFileSync(certFile, 'utf8'), stock);
  assert.equal(fs.existsSync(path.join(home, STAMP)), false);
});

test('ca install without a stamp does not call an absent root retired', t => {
  const { replace, run } = fixture(t);
  replace(bundle({ name: 'Good', pem: good.pem }));
  assert.deepEqual(run().map(a => a.status), ['ok']);
});

test('ca reports a root as retired once macOS ships a bundle without it, until the entry is deleted', t => {
  const { root, home, run, replace, check, messages } = fixture(t);
  run();
  replace(bundle({ name: 'Good', pem: good.pem }, { name: 'Other', pem: other.pem }, { name: 'New', pem: cert('new').pem }));
  check();
  assert.ok(messages.some(m => m.includes('retired Bad Root')));
  assert.deepEqual(run({ apply: false }).map(a => a.status), ['retired']);
  fs.writeFileSync(path.join(root, 'ca/distrusted.json'), '[]');
  run();
  assert.deepEqual(readStamp(home)?.retired, []);
});

test('ca reports a root as retired when macOS ships text identical to the filtered copy', t => {
  const { certFile, run, replace, check, messages } = fixture(t);
  run();
  replace(fs.readFileSync(certFile, 'utf8'));
  messages.length = 0;
  check();
  assert.ok(messages.some(m => m.includes('retired Bad Root')));
});

test('ca status is silent when the bundle is unchanged', t => {
  const { run, check, messages } = fixture(t);
  run();
  messages.length = 0;
  assert.deepEqual(check(), []);
  assert.deepEqual(messages, []);
});

test('ca status warns on every shell while macOS has restored a root', t => {
  const { home, stock, run, replace, check, messages } = fixture(t);
  run();
  const stamp = fs.readFileSync(path.join(home, STAMP), 'utf8');
  replace(stock);
  messages.length = 0;
  check();
  check();
  assert.equal(messages.filter(m => m.includes('trusts Bad Root again')).length, 2);
  assert.equal(fs.readFileSync(path.join(home, STAMP), 'utf8'), stamp);
  run();
  messages.length = 0;
  check();
  assert.deepEqual(messages, []);
});
