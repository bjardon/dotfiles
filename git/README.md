# Git

This area owns my global Git config. It's linked to `~/.gitconfig`, so
`git config --global` writes into this checkout and shows up in `git diff`.

The email is GitHub's noreply address, so it's safe in a public repository.
Credentials stay out of this file. `gh` handles them.

## Restore

With Node.js 22 or newer, pnpm 11.5.2, and `pnpm install --frozen-lockfile` already completed at the repository root:

```sh
pnpm run check
pnpm test
pnpm run git install
pnpm run git install --apply
```

The first install command previews the change. Applying moves an existing file to
`~/.local/state/dotfiles/backups/<run-id>/.gitconfig` and creates the link. A
correct link stays untouched on repeat runs.

Keep this checkout in a permanent location, because the installed link points
into it.

## Recovery

Remove the link and move the printed backup back:

```sh
unlink ~/.gitconfig
mv ~/.local/state/dotfiles/backups/<run-id>/.gitconfig ~/.gitconfig
```

Backups are never pruned automatically.

## Checks

`pnpm run check` parses the file with `git config` and rejects literal `/Users/`
paths. `pnpm test` runs the installer against temporary homes.
