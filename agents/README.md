# Global agent instructions

This area owns personal instructions shared across projects. The repository-root
`AGENTS.md` and `CLAUDE.md` describe how to work on dotfiles itself.

| Tracked file | Installed location |
| --- | --- |
| `agents/AGENTS.md` | `~/.agents/AGENTS.md` and `~/.codex/AGENTS.md` |
| `agents/CLAUDE.md` | `~/.claude/CLAUDE.md` |

Edit `agents/AGENTS.md` to change shared preferences. Claude imports it through
`@~/.agents/AGENTS.md`; keep Claude-specific instructions in `agents/CLAUDE.md`.
Claude also requires the `unslop` skill for all writing.
Restore [skills](../skills/README.md) to make that skill available in Claude Code.

`~/.agents/AGENTS.md` is our shared location. The additional Codex link and the
Claude file use the default user-level locations documented by
[Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and
[Claude Code](https://code.claude.com/docs/en/memory). This installer targets the
standard Mac layout. Custom `CODEX_HOME` or Claude configuration directories need
separate setup. Codex prefers `AGENTS.override.md` when present, so check for a
local override if these instructions do not appear. Claude Cowork skips user
instruction symlinks outside its working directory; this setup targets Claude Code.

## Restore

With Node.js 22 or newer and `npm ci` already completed at the repository root:

```sh
npm run check
npm test
npm run agents -- install
npm run agents -- install --apply
```

The first install command previews changes. Applying creates symlinks into this
checkout. Existing files, directories, and conflicting or broken links move to
`~/.local/state/dotfiles/backups/<run-id>/`, retaining their relative home paths.
Correct links remain untouched on repeat runs. The installer validates both
sources and all parent directories before writing, and restores an existing item
if creating its replacement link fails. Parent symlinks are rejected.

Keep this checkout in a permanent location. Edits here become available through
the installed links. Start a new agent session after editing. In Claude Code,
use `/context` to confirm the memory file loaded. In Codex, ask a new session to
summarize its loaded instructions.

## Recovery

Each replacement prints its backup path. Remove the installed link and move the
backup to its original location, substituting the printed run ID:

```sh
unlink ~/.codex/AGENTS.md
mv ~/.local/state/dotfiles/backups/<run-id>/.codex/AGENTS.md ~/.codex/AGENTS.md
```

Use the same procedure for `.agents/AGENTS.md` and `.claude/CLAUDE.md`.
Newly created links have no backup;
remove them with `unlink`. Backups are never pruned automatically. If a run stops
partway through, preview again to see the remaining changes.

## Checks

`npm run check` checks TypeScript and both areas. `npm test` exercises restoration
in temporary homes, including backups, repeat runs, and failures. For a separate
preview, use `npm run agents -- install --home /path/to/existing/test-home`.
Keep global preferences concise. Put project conventions in each project's own
instructions and task-specific procedures in skills. Credentials, company
settings, and session history belong outside this area.
