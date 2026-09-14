# AGENTS.md template

Keep `AGENTS.md` as short as possible. Agents load it into context, so use it as an index and routing layer, not a full policy document.

Prefer 5-8 high-signal bullets. Link to deeper docs for details.

```md
# Agent guidance

- Read `LANGUAGE.md` before naming or changing project concepts.
- Read `docs/architecture.md` before changing structure or cross-cutting behavior.
- Follow the project's documented guardrails and required checks. Do not weaken or bypass them without explicit approval.
- Use `<type>[optional scope][!]: <description>` for commits entering integration history. Descriptions are imperative, lowercase, and have no trailing period. Breaking changes use `!` and explain non-obvious breaks and migration paths in the body.
- Add the agent as a co-author of agent-generated commits.
- Visibly attribute agent-authored pull request descriptions, reviews, comments, and tracker artifacts.
- Use Linear as the issue tracker (team `[TEAM]`, project `[project]`); an issue id like `[TEAM]-123` resolves there. It owns Decision Maps, Decision Issues, Feature Issues, and Sub-Issues, each carrying one `type` label (`feature`, `decision`, `docs`, `bug`, `chore`); a decision issue needing a workflow also carries a `resolution` label (`research`, `grilling`, `prototype`), and none when settled in conversation. Feature Issues are vertical slices of user-recognizable behavior that nest shallowly, not technical tasks or horizontal layers. (Use the project's own tracker instead when it has one.)
- Once the project uses pull requests, squash-merge into the integration branch with the pull request title as the Conventional Commit message. (Follow the project's own workflow instead when it differs.)
- Engineering workflows (Decision Maps, grilling, issue writing) are defined in the SynoraStudio engineering playbook: [synorastudio/eng-playbook](https://github.com/synorastudio/eng-playbook). Consult it for how a workflow runs; this file records only project-owned specifics. (Omit or repoint this for a project outside the SynoraStudio playbook.)
- Default to collaborative planning for new or unclear work: develop product behavior, constraints, technical approach, and providers in conversation, and grill deep branches. Building is a separate mode you enter on request, not the default.
- Build only what the user has explicitly told you to build, one piece at a time. A planning conclusion, an accepted plan, or your own proposal is not that go-ahead. Verify proportionately, and ask before production access, persisted-data changes, authentication or permissions, secrets, paid services or external vendors, hard-to-reverse architecture, or broad refactors outside what you were asked to build.
- Commands and environment notes: see [README.md or docs path].

## Rules index

- [Rule name](docs/rule-doc.md): short description of the detailed agent guidance.
```

If no detailed rule docs exist, omit the Rules Index. If a detail needs more explanation, link to a focused doc instead of expanding `AGENTS.md`.
