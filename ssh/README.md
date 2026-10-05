# SSH hosts

This area owns the client-side SSH aliases for the devbox, which
[bjardon/fleet](https://github.com/bjardon/fleet) provisions. Other hosts in
`~/.ssh/config` stay local and unmanaged.

| Tracked file | Installed location |
| --- | --- |
| `ssh/devbox.conf` | `~/.ssh/config.d/devbox.conf`, included from `~/.ssh/config` |

`devbox` logs in as `bjardon` and `oxpbox` logs in as `oxperience`, on the same
machine. `oxpbox` used to be `devbox-oxp`. I renamed it because the two names
started the same way and I kept typing the wrong one.

`HostName` is the Tailscale MagicDNS short name `devbox`. This repository is
public, and the short name keeps the tailnet ID out of it. Resolving it needs
Tailscale running with MagicDNS on, which adds the tailnet search domain on macOS.

Keys stay in `~/.ssh` and out of this repository. `pnpm run check` rejects the
host file if it contains private key text, and runs `ssh -G` on each host so a
typo in an option fails the check.

## Restore

With Node.js 22 or newer, pnpm 11.5.2, and `pnpm install --frozen-lockfile` already completed at the repository root:

```sh
pnpm run check
pnpm test
pnpm run ssh install
pnpm run ssh install --apply
```

The first install command previews changes. Applying does two things:

1. Links `~/.ssh/config.d/devbox.conf` to this checkout. An existing file or
   conflicting link there moves to `~/.local/state/dotfiles/backups/<run-id>/`.
2. Adds `Include config.d/devbox.conf` at the top of `~/.ssh/config`, creating the
   file with mode 600 if it is missing. Before changing an existing config, the
   installer copies it to the same backup directory. It writes the new config to
   a temporary file and renames it into place, keeping the original mode.

The `Include` has to come before every `Host` block, or SSH applies it only inside
the block above it. Repeat runs leave a correct link and config alone. The
installer refuses to run if `~/.ssh` or `~/.ssh/config` is a symlink.

SSH uses the first value it finds for each option, so the included hosts win over
any `Host devbox` or `Host oxpbox` block still in `~/.ssh/config`. The installer
warns about those duplicates. Delete them by hand after applying.

Keep this checkout in a permanent location, because the installed link points
into it.

## Recovery

Each change prints its backup path. To undo, substituting the printed run ID:

```sh
unlink ~/.ssh/config.d/devbox.conf
cp ~/.local/state/dotfiles/backups/<run-id>/.ssh/config ~/.ssh/config
```

If the run created `~/.ssh/config` instead of updating it, delete the
`Include` line instead of restoring a backup. Backups are never pruned
automatically.

## Checks

`pnpm test` runs the installer against temporary homes, covering previews, backups,
repeat runs, and failures. For a separate preview, use
`pnpm run ssh install --home /path/to/existing/test-home`.
