---
name: build
description: Build a piece end to end, from interface design through a reviewed, green pull request ready for your review. For example, "build SYNO-42 end to end".
disable-model-invocation: true
license: MIT
---

# Build a piece end to end

Take one piece the user named from go-ahead to a pull request that is green, independently reviewed, and ready for the user's review. Run each step through its own Skill. The user returns only to approve the interface, to answer an escalation, and to merge.

## Start

Invoking this Skill with a named piece, such as a Feature Issue id or scope agreed in conversation, is the user's go-ahead to build it end to end. That go-ahead authorizes moving the issue to In Progress, committing, pushing a branch, opening a pull request, fixing its checks and review-bot findings, and marking it ready for review. Merging stays with the user. Without a named piece, ask which one to build.

Check readiness: every `blockedBy` points at done work, every decision it depends on is resolved, its acceptance criteria are written down and reflect those decisions, and setup only the user can do is named. Name any condition that fails and pause until it is fixed or the user says to build anyway.

Then move the issue to In Progress and create the piece's branch from the project's integration branch. Change no other issue status by hand. Later transitions come from tracker automation.

## Run the steps

Run each step with its Skill. `design-interface`, `implement`, and `review` hold safety checks this Skill does not repeat, so when one of them is not installed, stop before building and tell the user which one is missing. Only `babysit` has a fallback, under [Watch](#watch).

1. **Design** with `design-interface`. When the piece adds or changes a module interface, it commits stubs, signatures, types, and pending tests, then waits for the user to approve them. Note the approved commit. When no interface changes, record that and continue.
2. **Implement and verify** with `implement`. It builds behind the approved interface, follows the project's coding-standards and verification Project Recipes, and verifies every acceptance criterion. Leave committing the finished work to Publish.
3. **Review** with `review`, in a separate context: a subagent, a fresh session, or another model or provider. Give it the accepted source, the approved interface commit, and the diff, never the builder's reasoning. When no separate context is available, skip to Publish and say in the pull request that independent review has not run.
4. **Fix** with `implement`. Hand it the blocking and should-fix Findings, then verify again and return to Review with the earlier Findings attached. Keep nits for the pull request description.

## Stop the loop

The loop ends clean when a review reports no blocking or should-fix Findings. It stops and escalates to the user when any of these happens:

- Three review rounds have run.
- The review reports a return: a Finding an earlier round closed has come back.
- A Finding can only be fixed by crossing a pause condition: a product-scope change, a hard-to-reverse architecture decision, a new paid service or external vendor, risk to persisted data, a change to authentication, permissions, secrets, or other security-sensitive behavior, or a broad refactor outside the piece.

An escalated loop still publishes, as a draft, so the user sees the state of the work. The description says why the loop stopped.

## Record Guardrail Candidates

For each routed Finding, record a Guardrail Candidate in the home for its route:

- `check` and `project convention` go to the project's tracker.
- `playbook convention` goes to the Engineering Playbook's tracker when Agent Guidance or the user names it. Describe the general pattern with no client names, client code, or client paths, and link the pull request only when it belongs to a SynoraStudio-owned repository. When the playbook's tracker is unknown, list the candidate in the pull request for the user instead.

Search the home for an existing candidate describing the same pattern first. On a match, comment the new occurrence on it. Otherwise create a `type: guardrail` issue. Mark each issue and comment visibly as agent-authored.

## Publish

Commit following the project's commit convention, with the agent as co-author, and push. Open the pull request as a draft. Open it ready for review instead only when the loop ended clean and the project's review bot skips drafts. An escalated or unreviewed loop always opens a draft. Follow the project's pull request template, and make sure the description has:

- **Summary**: what changed, linking the issue, Decision Issue, or ADR that holds the reasoning.
- **Diagram**: a Mermaid diagram, only when the change adds or changes a boundary, a data flow, or a state transition.
- **Verification**: each acceptance criterion with its evidence, and steps for the user on any criterion you could not exercise.
- **Delivery record**: the review rounds run, Findings fixed by tier and severity, escalations, and deferred nits.
- **Guardrail candidates** (optional): links to the candidates created or commented on.
- **Approved deviations** (optional): each approved deviation and where it was approved.

End it with the issue reference, closing only when this pull request completes the issue, and visible agent attribution.

## Watch

Run `babysit` on the pull request. Without it, watch the pull request yourself:

- Wait for required checks and review bots by whatever means the client offers, with no time limit of your own.
- Fix failures the change caused and blocking or should-fix bot findings, verifying each fix locally before pushing. Never weaken, skip, or delete a check. Rerun a suspected flaky check once, then report it. Report a failure that also happens on the base branch instead of fixing it.
- Reply on every bot thread with what changed or why nothing did, marked as agent-authored. Leave comments from people for the user.
- Stop and report after five fix attempts, or when a fixed finding comes back.
- Add your fixes to the Delivery record, keeping the loop's entries.

Mark the pull request ready for review once it is green and every bot finding is fixed or answered. An escalated loop stays a draft.

## Finish

Finish when the pull request is ready for the user's review, or when the loop or `babysit` stopped and the user knows why. Report the pull request, the review rounds and their outcome, any escalation waiting on the user, the Guardrail Candidates recorded, and acceptance criteria the user still needs to check by hand.
