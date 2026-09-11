# Skills

This is the personal Mac skill selection. Fleet manages Linux profiles separately.

Selected upstream skills live in `vendor/`, with their source repository, exact
commit, upstream directory tree hash, and license recorded in `manifest.json`.
Copies include supporting files. The original seven revisions match the previous skills.sh
lockfile and were checked against installed files before import. The twelve
SynoraStudio skills were imported directly from a pinned upstream commit. Licenses live
in `licenses/`. Selected personal skills belong here. Record upstream licensing accurately.
SynoraStudio was explicitly requested despite having no declared license;
`NOASSERTION` and its provenance note record that status without granting rights.

The installer links these copies into `~/.agents/skills` and `~/.claude/skills`,
matching the shared and Claude layout used on this Mac. It does not install the
full Cursor or Matt Pocock plugins. Plugin hooks and other unselected skills are
outside this selection.

Composio and Railway remain owned by their CLIs. See `cli-managed.md` for their
observed versions and restore commands. Their generated files are not vendored.

Do not copy credentials, plugin caches, company-specific skills, or whole agent
configuration directories into this repository.
