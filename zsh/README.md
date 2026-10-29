# Zsh

This area owns my zsh startup files. History (`~/.zsh_history`) and saved
Terminal sessions (`~/.zsh_sessions`) stay local.

| Tracked file | Installed location | When zsh reads it |
| --- | --- | --- |
| `zsh/zshenv` | `~/.zshenv` | Every shell, including `zsh -c` from scripts and agents |
| `zsh/zprofile` | `~/.zprofile` | Login shells |
| `zsh/zshrc` | `~/.zshrc` | Interactive shells |

PATH entries that scripts and agent tool shells need go in `zshenv`. Each file's
header comment says what belongs in it.

The files source a few tools that may not be installed yet, such as Homebrew,
Oh My Zsh, and Vite+. Each of those lines checks that the file exists first, so a
fresh Mac gets a working shell before everything is installed.

`zshrc` also runs the [distrusted CA roots](../ca/README.md) check. It costs one
`zstat` per shell and only runs Node when `/etc/ssl/cert.pem` has changed.

## Oh My Zsh

`zshrc` loads [Oh My Zsh](https://github.com/ohmyzsh/ohmyzsh) with the
`af-magic` theme and the `git` plugin. This repository doesn't vendor Oh My Zsh.
It's thousands of files and only one theme and one plugin are in use. Instead,
[`oh-my-zsh-commit`](oh-my-zsh-commit) pins the commit to run.

`zshrc` turns off Oh My Zsh's automatic updates, so the checkout only moves when
I update it. `pnpm run zsh install` compares `~/.oh-my-zsh` with the pin and
prints a `missing` or `drift` line when they differ. It never clones or updates
Oh My Zsh itself.

To install it on a new Mac, run this from the repository root:

```sh
git clone https://github.com/ohmyzsh/ohmyzsh.git ~/.oh-my-zsh
git -C ~/.oh-my-zsh reset --hard "$(cat zsh/oh-my-zsh-commit)"
```

Use `reset --hard` on `master`, not `checkout <commit>`. On a detached HEAD,
`omz update` updates `master` and then switches back to the old commit.

To update, run `omz update`, then record the new commit and commit the change:

```sh
git -C ~/.oh-my-zsh rev-parse HEAD > zsh/oh-my-zsh-commit
```

`~/.oh-my-zsh/custom` holds only the stock examples. Anything added there would
need to move into this area.

## Restore

With Node.js 22 or newer, pnpm 11.5.2, and `pnpm install --frozen-lockfile` already completed at the repository root:

```sh
pnpm run check
pnpm test
pnpm run zsh install
pnpm run zsh install --apply
```

The first install command previews changes. Applying symlinks the three files
into your home directory. Existing files, directories, and conflicting or broken
links move to `~/.local/state/dotfiles/backups/<run-id>/`. Correct links stay
untouched on repeat runs. If creating any link fails, the installer removes the
links it made in that run and puts the original files back. Open a new terminal after applying.

Keep this checkout in a permanent location, because the installed links point
into it.

## Installers that edit these files

Tool installers often append a PATH line to `~/.zshrc` or `~/.zshenv`. With the
links in place, that line lands in this checkout and shows up in `git diff`.
Review it, replace any `/Users/<name>` path with `$HOME`, and commit it.

Some installers rewrite the whole file instead of appending, which replaces the
link with a plain file. After installing a new CLI, run `pnpm run zsh install`.
A `replace` line means the link is gone. Copy the installer's change into this
area, then apply again.

## Recovery

Each replacement prints its backup path. Remove the installed link and move the
backup back, substituting the printed run ID:

```sh
unlink ~/.zshrc
mv ~/.local/state/dotfiles/backups/<run-id>/.zshrc ~/.zshrc
```

Use the same steps for `.zshenv` and `.zprofile`. Backups are never pruned
automatically.

## Checks

`pnpm run check` parses each file with `zsh -n`, rejects literal `/Users/`
paths, and requires a full commit hash in `oh-my-zsh-commit`. `pnpm test` runs the installer against temporary homes, covering previews,
backups, repeat runs, and failures. For a separate preview, use
`pnpm run zsh install --home /path/to/existing/test-home`.
