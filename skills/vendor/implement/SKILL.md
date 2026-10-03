---
name: implement
description: Implement a piece the user explicitly told you to build, as verified production code, or fix review Findings on it. Use after that go-ahead, or when a delivery loop reaches its Implement, Verify, or Fix step. Never use during planning.
license: MIT
---

# Implement what the user asked you to build

Turn the work the user asked you to build into working, verified production code. Make local engineering decisions inside that scope without creating new product commitments.

## Check readiness

Planned work is ready to build when all of these hold:

- Every `blockedBy` relation on it points at done work.
- Every decision it depends on is resolved. That includes decisions tracked on the issue, as Decision Issues, or as open questions in an ADR or Living Doc that names the work.
- Its observable outcome and acceptance criteria are written down, and they reflect the decisions settled while planning it.
- Setup only the user can do, such as creating accounts, keys, or environment variables, is named.

Check each condition against the tracker and the repo, and name the condition that fails. These four are the whole test. Run the check when the user asks whether work is ready, and again once the user tells you to build, before editing. When a condition fails at that point, pause. Build only after it is fixed, or after the user hears which condition fails and still says to build. A ready piece still waits for the user's go-ahead.

## Confirm the user asked you to build it

Implement only what the user has explicitly told you to build, one piece at a time. That go-ahead is a plain instruction naming the Feature Issue or the scope to build now. Selecting Feature Issues or summarizing agreed scope supplies the content but is not that go-ahead, and you never treat your own proposal or summary as one. If the user has not told you what to build, the work is still in planning: stay collaborative and route back to Feature Planning (`map-decisions`, `grill`, or `write-issues`) instead of editing production code.

Once the user names it, ground the work in the most specific accepted source available:

- One or more selected Feature Issues, including their `Settled decisions`.
- Scope agreed in the current conversation.

A Feature Issue is useful, not mandatory. When sources conflict or leave a blocking product decision unresolved, pause for the user. When the slice still leaves choices open that would change its scope or acceptance criteria, suggest `grill` before building.

Read the target repo's Agent Guidance and only the Language, ADRs, Living Docs, Project Recipes, tracker context, Project Guardrails, and code relevant to the work you were asked to build. Project Recipes are the docs Agent Guidance points to for the project's own verification steps (usually `docs/verification.md`) and coding standards (usually `docs/coding-standards.md`). Include external controls such as required checks, protected integration paths, deployment gates, and tracker states when they affect delivery. Use the current implementation to discover constraints. Do not use it to expand the accepted scope.

Before editing, identify the observable outcome, the acceptance criteria that apply, and how the result can be verified. If what you were asked to build still contains several independent or dependency-ordered pieces, start with the smallest dependency-ready piece unless the user asked to complete the whole set.

## Work inside what you were asked to build

When the user approved an interface for this work, such as stubs, signatures, types, and pending test names committed on the branch, implement behind it and turn each pending test into a real one. Changing an approved interface pauses for the user. When the piece adds a module or changes what callers of one must know and no interface was approved, propose that interface as stubs, signatures, types, and pending test names in one commit, and wait for the user to approve it before implementing.

Write code to the coding-standards recipe. Without one, follow the patterns of the code around the change.

Choose reversible implementation details autonomously. Pause when the work requires:

- A product-scope change.
- A hard-to-reverse architecture decision.
- A new paid service, external vendor, or hosted dependency.
- Risk to persisted data or a migration whose effects are not already accepted.
- A change to authentication, permissions, secrets, or other security-sensitive behavior.
- A broad refactor outside what you were asked to build.

These pauses hold for every piece of work on their own, whether or not the target repo's guidance restates them. They are this skill's safety contract, so a copy of it enforces them anywhere.

Preserve unrelated work already present in the repo. When the accepted outcome conflicts with the current implementation or cannot be completed as written, report the conflict instead of quietly changing the contract.

Follow applicable Engineering Conventions and Project Guardrails. Prefer preserving a constraint through architecture or code, then automated checks, then concise guidance. Never bypass or weaken a guardrail merely to make the work pass.

Use this deviation rule exactly:

> Any deliberate failure to meet an applicable Engineering Convention requires explicit approval.

## Implement and verify

Keep the feedback loop tight. Use focused checks while working and run the broadest relevant project checks before finishing. Follow the verification recipe for the checks to run, how to launch the system, how to get past authentication, and the walkthrough steps that exercise acceptance criteria. Without one, discover the checks from Agent Guidance, project configuration, and existing conventions rather than assuming a stack.

Add or update tests at stable, behavior-relevant boundaries when the repo supports them and the change warrants coverage. Use manual verification when automated coverage is unavailable or disproportionate, and state exactly what was checked.

When you add an automated guardrail, such as a lint rule, a test suite, or a required check, watch it fail on a violation once before relying on it: break an input, loosen a rule temporarily, or open a throwaway pull request, then restore the change. Report what you broke and what caught it.

Some criteria you cannot exercise yourself, such as flows behind an external sign-in you may not create accounts for. List each one in the verification report with the steps the user should follow. When this blocks most of a slice's criteria, suggest giving agents a non-production way in, such as test users the user provisions. That is an authentication change, so it waits for the user's approval.

Before finishing:

1. Verify each applicable acceptance criterion.
2. Inspect the full diff for scope drift, accidental changes, weak error handling, and missing coverage.
3. Run the broadest relevant checks available.
4. Separate failures caused by the change from unrelated failures that already existed. Fix only failures inside what you were asked to build and report the rest.
5. Confirm that changed Project Guardrails and their documentation or external configuration still agree, including every copy of a changed check or command.

## Fix review Findings

When a reviewer hands back Findings, fix every `blocking` and `should-fix` one inside what you were asked to build, then verify again. Leave `nit` Findings for the pull request description. A Finding whose fix would cross one of the pause conditions above goes to the user instead of being fixed. Report each Finding as fixed or escalated so the next review round can check it.

## Keep durable knowledge true

Update an existing durable artifact when the implementation changes the truth it owns:

- `LANGUAGE.md` for recurring project vocabulary.
- ADRs for accepted, hard-to-reverse, surprising trade-offs.
- Living Docs for current system shape, operations, onboarding, or project guidance.

Two updates are easy to miss:

- When the change adds a check, command, or other fact, search Agent Guidance and docs for every list that enumerates its kind, such as a list of checks to run. When it removes or renames one, search for every copy of the old one. Update each list or copy, or replace it with a pointer to the source that defines it, such as the project's scripts or CI configuration.
- When the change introduces system boundaries, such as a first app, a data model, an auth flow, or an integration, and no document describes them yet, create `docs/architecture.md` with a short navigational overview.

When an approved change amends accepted product scope, reconcile the upstream source that defined it the same way: update it when editable, or record the superseding decision and its provenance when it cannot be updated.

Do not create speculative documentation or turn implementation notes into long-lived artifacts. Use `handoff` when unfinished work must continue in another session.

Record project knowledge a future session needs, such as an environment quirk or a verification workaround, in Agent Guidance or a Living Doc rather than in agent-private memory, which no other agent or human can read or correct.

A pull request description has these sections, applied through the project's pull request template when it has one:

- **Summary**: what changed, linking the issue, Decision Issue, or ADR that holds the reasoning instead of restating it.
- **Diagram**: a Mermaid diagram, only when the change adds or changes a boundary, a data flow, or a state transition.
- **Verification**: each acceptance criterion with its evidence, and steps for the user on any criterion you could not exercise.
- **Delivery record**: when an agent review loop ran, the rounds, Findings fixed by tier and severity, escalations, deferred nits, and fixes made after the pull request opened.
- **Guardrail candidates** (optional): links to the Guardrail Candidates the change created or added to.
- **Approved deviations** (optional): each approved deviation and where it was approved.

Move the issue to In Progress when you start building it. Change no other tracker status by hand unless the user asks; later transitions come from tracker automation, such as Linear's GitHub integration. Commit only when the user asks, the repo's Agent Guidance makes that part of the workflow, or the user told you to build the piece end to end, which also authorizes pushing a branch and opening a draft pull request, or a ready one when the project's review bot skips drafts. Attribute agent-generated work at the durable boundary that records it. Use commit attribution for repository changes and visible attribution for agent-authored pull request descriptions, reviews, comments, and tracker artifacts, following the project's established format.

## Follow the repository's integration workflow

Tracker hierarchy does not imply Git hierarchy. When the target repo uses branches and pull requests, create them around coherent repository changes rather than Decision Maps or issue nesting.

Every commit that enters integration history uses `<type>[optional scope][!]: <description>`. Allowed types are `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, `style`, and `revert`. Write an imperative, lowercase description without a trailing period. Use `!` for a breaking change and explain the break and migration path in the body when they are not obvious. Keep the scope optional, split work that needs more than one primary type, and preserve required reference and attribution footers.

A squash workflow applies the rule to the pull request title or final squash message. A merge or rebase workflow applies it to every commit entering the integration branch. Follow the project's stronger local guardrails when present.

Fix or answer every review finding on the pull request, from people or review bots, before it merges. Reply on each thread with what changed or why nothing did.

Target the repo's normal integration branch unless Agent Guidance requires a Milestone integration branch. Use that exception only when several changes must be verified atomically and their intermediate states cannot safely reach the normal integration branch. Use stacked branches only for real code dependencies, not because one tracker item is another item's child.

One issue may ship in several pull requests. Only the one that completes the issue uses a closing reference; the others reference it without closing it. When planning split the work into pull requests, compare the diff against that plan before opening each one, and propose a further split when the diff outgrew it.

## Finish

Report the implemented outcome, verification performed, Project Guardrails added or changed, any departure from the accepted source, and remaining blockers or follow-up work.

Finish when the work you were asked to build works, every applicable acceptance criterion has evidence, applicable conventions and Project Guardrails are satisfied or have an approved deviation, the final diff has been reviewed, relevant durable knowledge matches the implementation, and any unresolved failure is reported with its effect.
