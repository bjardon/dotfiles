# Tools

This area records what's installed on this Mac, so a new one can get the same
tools and a review can start from a diff.

| File | What it lists | Checked by `status` |
| --- | --- | --- |
| [`Brewfile`](Brewfile) | CLI tools and the casks Homebrew manages here | Yes |
| [`Brewfile.apps`](Brewfile.apps) | Apps for a fresh Mac, including App Store apps | No |
| [`pnpm-globals`](pnpm-globals) | `pnpm add -g` specs, one per line | Yes |

Most apps were installed by hand and update themselves, so they can't be compared
with Homebrew's records. That's why they have their own file. Move a line to
`Brewfile` after adopting the app with `brew install --cask --adopt <cask>`.

Homebrew installs whatever is current, so `Brewfile` doesn't pin versions. Node.js
is pinned in `pnpm-globals` to the patched release it was last moved to.

## Keeping it current

After installing or removing a tool, edit the list and run:

```sh
pnpm run tools status
```

It prints a `missing` line for anything listed but not installed, an `untracked`
line for anything installed but not listed, and a `drift` line when a pinned
pnpm version differs. Dependencies of other formulae don't count as untracked.

## Restore

Install [Homebrew](https://brew.sh) and pnpm 11.5.2, and run
`pnpm install --frozen-lockfile` at the repository root. Then:

```sh
brew bundle --file tools/Brewfile
brew bundle --file tools/Brewfile.apps
xargs -n 1 pnpm add -g < tools/pnpm-globals
pnpm run tools status
```

`trusted: true` tells Homebrew to allow that formula from a third-party tap.
Homebrew won't load or upgrade a third-party formula without it. App Store lines
need `mas` and a signed-in App Store account.

These have no cask or need their own installer, so get them by hand:

- FortiClient, from the client's managed setup
- B4 Code
- Menu Bar Spacing
- Respawken

## Checks

`pnpm run check` parses all three files and rejects unknown lines, duplicates,
and a third-party formula or cask whose tap isn't listed. `pnpm test` covers the
parsers and the comparison. Neither one calls Homebrew or pnpm.
