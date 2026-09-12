# Dotfiles

Personal macOS configuration, paired with [bjardon/fleet](https://github.com/bjardon/fleet).
Fleet provisions Linux machines and their account profiles. This repository owns
my Mac setup, starting with the agent skills I want on my next machine.

## Skills

Nineteen skills are checked into Git. The original seven match the versions
installed on this Mac; the twelve SynoraStudio skills are pinned to upstream
commit `5ba01ca31041526e7105bd3278ecd1c6b057acd8`.

| Source | Selected skills |
| --- | --- |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) | blast-radius, bro, how, unslop, why |
| [Matt Pocock](https://github.com/mattpocock/skills) | codebase-design, writing-for-agents |
| [SynoraStudio](https://github.com/synorastudio/eng-playbook) | adopt-project, grill, handoff, implement, init-agent-os, intake, maintain-language, maintain-living-docs, map-decisions, prototype, write-adr, write-issues |

[The manifest](skills/manifest.json) records exact commits, file checksums, licenses,
and destination folders. SynoraStudio declares no upstream license; its entries
use `NOASSERTION` with a [provenance note](skills/licenses/eng-playbook.txt). [Skill policy](skills/README.md) describes what belongs
here. [CLI-managed skills](skills/cli-managed.md) records Composio and Railway.
`gh-cli`, `linear-cli`, `find-skills`, and the missing `discuss` are not selected.
Existing unselected skills are left alone.

## Restore on a Mac

Install Git and Node.js 22 or newer first. Clone this repository into a permanent location:

```sh
git clone git@github.com:bjardon/dotfiles.git ~/Documents/Experiments/dotfiles
cd ~/Documents/Experiments/dotfiles
npm ci
npm run check
npm run skills -- install
npm run skills -- install --apply
```

`install` previews every link without writing files. `--apply` links the vendored
skills into `~/.agents/skills` and `~/.claude/skills`. Existing files, directories,
and conflicting or broken links are moved into
`~/.local/state/dotfiles/backups/<run-id>/`, preserving their relative home paths.
Already-correct links are left alone. No downloads or upstream installers run.
Restart your coding tools after applying.

Keep the checkout in place because installed links point into it. If you move it,
run the installer from its new location. Run Composio and Railway's documented
restore commands separately after installing their CLIs.

## Recovery

Each changed item prints its backup path. To undo a replacement, remove only the
new skill symlink, then move the matching backup to the original path. For example,
replace `<run-id>` with the backup directory printed by the installer:

```sh
unlink ~/.agents/skills/bro
mv ~/.local/state/dotfiles/backups/<run-id>/.agents/skills/bro ~/.agents/skills/bro
```

For a newly created link with no backup, `unlink` is sufficient. Backups are never
pruned automatically. An interrupted run can leave some links applied; rerun the
preview to inspect the remaining work or restore the printed backups.

## Maintaining the selection

Edit `skills/manifest.json` to change the list or destination folders. Adding or
updating a skill requires copying the complete upstream skill directory at an
explicit commit, retaining its license, and updating its source path, tree hash,
and SHA-256 file inventory. Review the diff and run the checks below before
applying. Keep local modifications explicit in Git; do not silently refresh from
an upstream branch or run skills.sh updates on these managed skills.

Removing a manifest entry stops managing it; it does not delete its existing
links. Remove those links explicitly before deleting its vendored directory.
Credentials, company-specific settings, plugin caches, and agent session history
stay outside this repository.

The installer and tests are TypeScript, run through `tsx`. Run `npm ci` after
cloning to install the locked development tools. No build step is required.
`tsx` executes TypeScript without type checking, so `npm run check` and `npm test`
both run strict `tsc --noEmit` checks first. `npm run typecheck` checks types alone.
JSON manifests are validated at runtime before any filesystem changes.

## Validation

```sh
npm run check
npm test
```

Tests use temporary homes for preview, installation, backups, repeat runs, and
failure cases. They do not alter the current user's skill installation.
