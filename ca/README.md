# Distrusted CA roots

This area removes compromised root certificates from `/etc/ssl/cert.pem` until
Apple drops them itself.

macOS command-line tools (`curl`, `git`, `python3`, `perl`, `ruby`, `openssl`)
trust every root in that file. They don't check revocation, and the file only
changes when a macOS update replaces it. So when a CA is distrusted, browsers and
Keychain stop trusting it within days, while these tools keep trusting it until
Apple ships a new file. A macOS update can also put back a root you removed by
hand. That happened with 27.2.

[`distrusted.json`](distrusted.json) lists the roots to remove. Each entry has
the root's name, its SHA-256 fingerprint, the advisory that explains it, and the
date it was added. Matching is by fingerprint, so a changed header in Apple's
file doesn't affect it.

## How it stays useful

- **A zsh startup check.** `zsh/zshrc` compares the file's inode, mtime, and size
  with the last check. Most shells stop there, at the cost of one `zstat`. When
  the file has changed, it runs `pnpm run ca status`. That prints a warning when
  a listed root is back. The warning repeats in every new shell until you run
  `pnpm run ca install --apply`.
- **Entries report when to delete them.** When macOS replaces the file with one
  that no longer contains a listed root, the check prints a `retired` line. That
  entry has nothing left to do, so delete it. `pnpm run check` repeats the line
  until you do.
- **An empty list is the normal state.** With no entries, nothing gets removed.
  The startup check only records the file's current state.

## Adding a root

When an advisory distrusts a root that macOS still ships, get its fingerprint
from the advisory or from the file itself:

```sh
openssl crl2pkcs7 -nocrl -certfile /etc/ssl/cert.pem |
  openssl pkcs7 -print_certs | awk '/subject=.*<CN>/{p=1} p' |
  openssl x509 -noout -subject -fingerprint -sha256
```

Replace `<CN>` with part of the root's common name. Add an entry with the
fingerprint in uppercase, colon-separated form, run `pnpm run check`, then
apply. Only list roots the advisory says to remove. Removing a root that
unaffected sites still chain to breaks them for these tools.

## Restore

With Node.js 22 or newer, pnpm 11.5.2, and `pnpm install --frozen-lockfile`
already completed at the repository root:

```sh
pnpm run check
pnpm test
pnpm run ca install
pnpm run ca install --apply
```

The first install command prints `remove`, `ok`, or `retired` for each entry.
Applying copies the current file to
`~/.local/state/dotfiles/backups/<run-id>/etc/ssl/cert.pem`, writes a filtered
copy with `sudo install`, and confirms the result. It asks for your password
only when there's something to remove. Running it again with nothing to remove
changes nothing. It also records the file's state in
`~/.local/state/dotfiles/ca/last-check`, which the zsh check reads.

## Recovery

Copy the printed backup over the file:

```sh
sudo install -m 0644 -o root -g wheel ~/.local/state/dotfiles/backups/<run-id>/etc/ssl/cert.pem /etc/ssl/cert.pem
```

Backups are never pruned automatically.

## Limits

- Only `/etc/ssl/cert.pem` is covered. Tools that bundle their own roots (Node.js,
  Python's `certifi`, Electron apps, the Google Cloud SDK) need their own
  updates.
- Editing the file by hand after a recorded check looks like a macOS
  replacement. A root you removed by hand then shows as `retired`. Use
  `pnpm run ca install --apply` instead of editing the file.

## Checks

`pnpm run check` validates every entry's fields and rejects duplicates.
`pnpm test` runs installs and status checks against temporary bundles and homes.
It covers previews, backups, repeat runs, failed writes, and retirement.
