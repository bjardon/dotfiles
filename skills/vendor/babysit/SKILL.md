---
name: babysit
description: Watch a pull request until its checks are green and review-bot findings are handled, fixing failures along the way. Use when asked to babysit, watch, or get a pull request green.
license: MIT
---

# Babysit a pull request

Bring a pull request to green: every required check passing and every review-bot finding fixed or answered. The user should arrive at a pull request that only needs their judgment.

## Find the pull request

Use the pull request the user names, or the one open for the current branch. Read its description, its acceptance criteria source, Agent Guidance, and the Project Recipes it points to, usually `docs/verification.md` and `docs/coding-standards.md`.

## Wait for results

Wait until the required checks finish and the project's review bots have posted. Use whatever the client offers: a background watcher, notifications, or polling with growing intervals. Set no time limit of your own. A hung job ends when the CI system's own timeout fails it.

## Fix failing checks

For each failing check:

1. Read its log and find the cause.
2. Decide whether the change caused it. A failure that also happens on the base branch existed before the change. Report it and leave it.
3. Fix a failure the change caused, verify the fix locally with the same check, commit following the project's commit convention with the agent as co-author, and push.

A suspected flaky check gets one rerun. When it fails again, report it as flaky with the evidence.

Fix code to satisfy a check. Never weaken, skip, or delete the check, or loosen its configuration, to turn it green.

Five fix attempts is the limit for one pull request, counting fixes for failing checks and for bot findings together. At the fifth, stop and report what still fails and what you tried.

## Handle review-bot findings

Sort each review-bot finding into a tier:

- `blocking`: a bug, a security issue, a convention, coding-standard, or guardrail violation, or an unmet acceptance criterion.
- `should-fix`: a code smell, weak error handling, or missing coverage.
- `nit`: anything else.

Fix blocking and should-fix findings the same way as a failing check. A finding that comes back after you fixed it means the fixes are oscillating. Stop and take it to the user. Reply on every bot thread with what changed, or for a nit or a finding you judge wrong, why nothing did. Mark each reply visibly as agent-authored. A fix that would need a product-scope change, a hard-to-reverse architecture decision, a new paid service, risk to persisted data, a change to authentication, permissions, or secrets, or a broad refactor stops the loop and goes to the user.

Comments from people are for the user. Leave them unanswered and list them in the report.

## Mark it ready

When every required check passes and every bot finding is fixed or answered:

- Add the fixes you made after the pull request opened to its description's Delivery record. Keep what the review loop already recorded there: rounds, Findings fixed by tier and severity, escalations, and deferred nits. When the description has no Delivery record, add one listing only your fixes.
- Mark a draft pull request ready for review when the user asked for end-to-end delivery or asked you to, unless its delivery review loop escalated. Otherwise leave its state alone.

## Finish

Finish when the pull request is green with every bot finding fixed or answered, or when you stop at the attempt limit, a returning finding, or an escalation. A required check that also fails on the base branch blocks green without being yours to fix: once everything else is green or answered, finish, leave the pull request's state alone, and report that check as the blocker. Report the checks fixed, flaky checks, pre-existing failures, bot findings fixed and answered, human comments waiting for the user, and whether the pull request is ready.
