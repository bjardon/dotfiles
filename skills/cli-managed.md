# CLI-managed skills

Track the dependency and its setup commands here. Let each CLI own its generated
skill files so CLI upgrades can keep the instructions compatible. Dotfiles does
not link over these skills, install CLIs, run their updaters, or store login state.

Observed on 2026-09-11:

| Skill | Owner | Installed CLI | Local metadata |
| --- | --- | --- | --- |
| composio-cli | Composio CLI | 0.4.1 | `.composio-release-tag` is `@composio/cli@0.4.1` |
| use-railway | Railway CLI | 5.27.0 | Separate copies exist in `.agents`, `.claude`, `.codex`, and `.cursor` |

These are observed versions, not an exact content lock. CLI-managed skill restore
may fetch newer content. The vendored skills are independently reproducible.

## Composio

After installing Composio CLI, its local help documents these recovery commands:

```sh
composio --version
composio --install-skill composio-cli codex
composio --install-skill composio-cli claude
```

The CLI also supports automatic skill installation. Use the explicit commands
when restoring a machine or recovering a missing skill. Confirm the available
flags with `composio --help` when changing CLI versions. Authenticate separately;
never commit `~/.composio`.

## Railway

After installing Railway CLI, target the coding tools you use:

```sh
railway --version
railway skills install --agent codex --agent claude-code --agent cursor
```

Local CLI help says installation always includes `~/.agents/skills` and also writes
to the requested agent directories. Without `--agent`, it detects installed tools.
`railway skills update` is an alias of `install`. Avoid `--force` when preserving
local edits. Review or back up existing copies before an update; their current
contents differ across agent folders. Dotfiles backups only cover the seven
vendored skills, not these CLI operations.

Use `railway skills install --help` to verify options for a future CLI version.
Authentication and MCP configuration are separate from tracking the skill.
