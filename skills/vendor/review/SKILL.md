---
name: review
description: Review a change independently and report tiered Findings. Use when asked to review a diff, branch, or pull request against its acceptance criteria and the project's conventions, or when a delivery loop needs its review round.
license: MIT
---

# Review a change

Review a change as a reviewer who did not build it, and report every problem as a Finding. You judge the code, not the story about the code, so you never edit it.

## Take a separate context

Review from a context that holds none of the builder's reasoning: a subagent, a fresh session, or another model or provider when one is available. When you are running in the context that built the change, say that this review does not count as independent, and run it anyway only if the user asks.

## Gather the inputs

Read:

- The accepted source: the Feature Issue or agreed scope, including its acceptance criteria and settled decisions.
- The approved interface commit, when the piece had one.
- Agent Guidance, `LANGUAGE.md`, and the Project Recipes it points to, usually `docs/coding-standards.md` and `docs/verification.md`.
- The Project Guardrails and conventions that apply to the files the change touches.
- The diff from the base branch, and enough surrounding code to judge it.
- Findings from earlier rounds, when this is not the first.

Leave out the builder's transcript, notes, and explanations. When the acceptance criteria are missing, review the rest and report the gap as a Finding.

## Audit the change

Check every item, on every round:

- **Acceptance criteria**: each one is met by the change, with a test or a verification step that shows it.
- **Interface drift**: the built interface matches the approved commit. Compare the interface files against it.
- **Scope drift**: nothing outside the accepted source, and no unrelated edits.
- **Correctness**: logic errors, unhandled cases, broken invariants, race conditions, and wrong error handling.
- **Security**: injection, authorization gaps, secrets in code or logs, and unsafe handling of untrusted input.
- **Conventions and guardrails**: commit form, documentation ownership, and every Project Guardrail the change touches. A guardrail weakened to make the change pass is blocking.
- **Coding standards**: the coding-standards recipe, or the patterns of the surrounding code when there is no recipe.
- **Code smells**: duplication, shallow modules, dead code, and misleading names.
- **Test coverage**: behavior that changed without a test at a stable boundary.

When the client can run parallel contexts, you may split the audit into passes, such as a separate security pass, and merge their Findings.

Report only what you can point to in the code. A suspicion you cannot confirm is a question in the report, not a Finding.

## Write each Finding

Each Finding carries:

- **Tier**, which decides what happens to it:
  - `blocking`: a bug, a security issue, a convention, coding-standard, or guardrail violation, an unmet acceptance criterion, or interface drift the user has not approved.
  - `should-fix`: a code smell, weak error handling, or missing coverage.
  - `nit`: anything else worth mentioning.
- **Severity**, its impact if shipped: `critical`, `high`, `medium`, or `low`. Tier and severity are independent. A naming-standard violation is blocking at low severity.
- **Location**: file and line.
- **Rule**: the acceptance criterion, convention, guardrail, recipe rule, or plain correctness concern it breaks.
- **Fix**: a short suggestion.
- **Route** (optional): set it when a control could have prevented the Finding. Use `check` when a deterministic check such as a lint rule, type constraint, or test could catch it, `project convention` when the project's recipes or Agent Guidance should state it, and `playbook convention` when it is a pattern every SynoraStudio project would want.

## Compare with earlier rounds

On a later round, mark each earlier Finding as fixed or still open. A Finding that an earlier round closed and this round finds again is a **return**. Flag it, because it means the loop is oscillating.

## Report

List the Findings ordered by tier, then severity. Then give:

- Counts by tier.
- Returns, if any.
- Routed Findings, which become Guardrail Candidates.
- Questions you could not confirm.
- Whether the review ran independently.

The verdict is clean when no blocking or should-fix Findings remain.

When you run on your own rather than inside a delivery loop, list routed Findings for the user instead of recording them anywhere.

## Finish

Finish when every audit item has been checked against the whole diff and every problem you found is a Finding, a return, or an open question.
