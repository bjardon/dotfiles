import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOT, compare, parseBrewfile, parseGlobals, verify, type Installed } from '../scripts/tools.ts';

test('tools check accepts the tracked lists', () => {
  verify(ROOT);
});

test('parseBrewfile reads each kind of line and skips comments', () => {
  const text = '# note\n\ntap "a/b"\nbrew "git"\nbrew "a/b/tool", trusted: true\ncask "warp"\nmas "Velja", id: 1607635845\n';
  assert.deepEqual(parseBrewfile(text), { taps: ['a/b'], formulae: ['git', 'a/b/tool'], casks: ['warp'], mas: ['Velja'] });
});

test('parseBrewfile rejects bad lines', () => {
  for (const [text, pattern] of [
    ['vscode "x"', /is not a tap/],
    ['brew "git"\nbrew "git"', /repeats/],
    ['tap "a/b"\nbrew "a/b/tool"', /needs trusted/],
    ['brew "a/b/tool", trusted: true', /without tap/],
    ['brew "git", trusted: true', /isn't from a third-party tap/],
  ] as const) assert.throws(() => parseBrewfile(text), pattern);
});

test('parseGlobals reads names, scopes, and pinned runtimes', () => {
  assert.deepEqual(parseGlobals('node@runtime:24.22.1\n@scope/tool\nsst\n'), [{ name: 'node', version: '24.22.1' }, { name: '@scope/tool' }, { name: 'sst' }]);
  assert.throws(() => parseGlobals('sst\nsst@1\n'), /repeats/);
});

const installed: Installed = { taps: ['a/b'], formulae: ['git', 'libfoo'], leaves: ['git'], casks: ['warp'], pnpm: { node: '24.22.1', sst: '4.0.0' } };

test('compare is empty when the lists match, and ignores dependencies', () => {
  const brewfile = { taps: ['a/b'], formulae: ['git'], casks: ['warp'], mas: [] };
  assert.deepEqual(compare(brewfile, [{ name: 'node', version: '24.22.1' }, { name: 'sst' }], installed), []);
});

test('compare reports missing, untracked, and drifted entries', () => {
  const report = compare({ taps: [], formulae: ['git', 'gh'], casks: [], mas: [] }, [{ name: 'node', version: '24.23.0' }, { name: 'vercel' }], installed);
  assert.deepEqual(report.sort(), [
    'drift     pnpm node is 24.22.1, tools/pnpm-globals pins 24.23.0',
    'missing   formula gh',
    'missing   pnpm vercel',
    'untracked cask warp',
    'untracked pnpm sst',
    'untracked tap a/b',
  ]);
});
