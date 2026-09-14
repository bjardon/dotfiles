---
name: grill
description: Run a Grilling Session over a plan, decision, or open question, developing options where none exist yet and stress-testing them where they do, through a round-based design-tree interview. Use when the user asks to grill, or to resolve a mapped decision branch. Do not use for ordinary implementation, code review, or broad project intake.
---

# Grill

Reach shared understanding on a plan, decision, or open question before implementation — developing the options where none exist yet, and stress-testing them where they do.

This skill does not ingest broad project context, initialize an Agent Operating System, or manage living docs. It creates no tracker issues, with one exception: the single blocking spin-off described under "Contribute back to the map". Use `intake`, `init-agent-os`, `write-issues`, or `maintain-living-docs` for those workflows.

## Core instruction

Interview the user relentlessly about every aspect of the plan until there is shared understanding.

Map the work as a design tree, where every decision branches into the decisions that depend on it. Work the tree in rounds. The frontier is every decision whose prerequisites are already settled — the questions answerable now without guessing at answers you have not heard yet. Ask the whole frontier in one round: number each question and give your recommended answer when you have enough context. Then wait for the user's answers before opening the next round.

A question whose answer depends on another still open in this round belongs to a later round, not this one. Each round of answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round.

If a question can be answered by inspecting the repo or existing docs, inspect those instead of asking.

## Inputs

Before grilling, read relevant existing artifacts when available:

- `LANGUAGE.md` and local `LANGUAGE.md` files.
- `LANGUAGE-MAP.md` if multiple language contexts exist.
- Relevant durable docs under `docs/`, including living docs and ADRs.
- The linked Decision Map and Decision Issue when the Grilling Session is resolving a mapped branch.
- The specific plan, feature, design, decision, or architecture question being grilled.

The subject may be a concrete proposal, or an open decision with no proposal yet — a mapped Decision Issue is often the latter. Both are in scope:

- **A proposal exists.** Stress-test it: attack its assumptions, boundaries, and failure modes.
- **No proposal yet.** Develop the options first — surface the credible candidates and recommend one — then stress-test the emerging choice. Do not ask the user to bring a plan; developing options from the constraints is the work.

Route away only when the subject is bigger than a single design to grill: `intake` for broad project context, or `map-decisions` when the work holds several dependent decisions.

## Grilling posture

When there is no proposal yet, first act as an option developer: lay out the credible options with a recommendation before pressing on them. Then start as a collaborative skeptic, and escalate when ambiguity, contradiction, or risk remains.

Push especially hard on:

- Ambiguous product language.
- Hidden assumptions.
- User-facing scope.
- Domain boundaries.
- Data ownership.
- State transitions.
- Failure modes.
- Auth, permissions, and security.
- External dependencies and vendor lock-in.
- Irreversible or expensive architecture choices.
- Places where the proposed design conflicts with existing docs or code.

## Design Tree method

Work from broad decisions to dependent details:

1. Clarify the target outcome.
2. Identify the main design branches.
3. Compute the frontier: every branch whose prerequisites are already settled.
4. Ask that whole frontier as one round of numbered, decision-forcing questions, each with a recommendation.
5. On the user's answers, resolve or explicitly defer each branch in the round.
6. Recompute the frontier — newly unblocked branches enter it — and ask the next round.
7. Continue until no branch is vague enough to threaten implementation.

Group only the currently answerable frontier into a round. Never batch a question that depends on an answer still open in this round, and never pad a round with questions the tree has not yet unblocked.

## Handle each turn

When the user replies with a question, uncertainty, a proposed alternative, or a prompt like "thoughts?", stay on the current round. Answer the user's question, refine the recommendation, and wait for an explicit resolution before opening the next round.

Treat these as signals to pause progression:

- The user asks for thoughts, trade-offs, or clarification.
- The user challenges the recommendation.
- The user proposes another framing or doc location.
- The user says to hold the next question.

Only open the next round when every decision in the current round is accepted, rejected, explicitly deferred, or clearly resolved by the user's response.

## Update docs during grilling

Use docs only for durable knowledge discovered during the interview. When a decision resolves a vocabulary ambiguity or other durable documentation point, update the smallest relevant doc immediately before moving to the next design branch.

Update `LANGUAGE.md` when a project-specific term is clarified, unless the user has asked not to edit files. Follow `../maintain-language/LANGUAGE-FORMAT.md`.

Prefer tightening an existing term over adding a new term when the decision is that a proposed phrase should not become project language.

After each inline doc update, briefly state:

- The resolved decision.
- The file changed.
- The next branch or question.

Offer an ADR only when all three are true:

1. The decision is hard to reverse.
2. The decision would be surprising without context.
3. The decision came from a real trade-off.

When an ADR is clearly warranted, offer to write it immediately and follow `../write-adr/ADR-FORMAT.md`.

When the session owns a linked Decision Issue, record its accepted resolution and update the parent Decision Map before moving on. Keep the full reasoning in the Decision Issue and only a linked summary in the map.

Do not update living docs, create Feature Issues, or initialize Agent OS files from this skill unless the user explicitly asks to switch workflows.

## Contribute back to the map

A branch can surface a question conversation cannot settle: it needs the higher fidelity of a prototype, away-from-keyboard research, or it is a substantial new decision in its own right. When the session is resolving a linked Decision Map, feed such a question back into the map rather than forcing an answer or resolving it here.

- Apply `map-decisions`' "substantial decision" bar first. A minor uncertainty still takes a recommendation and resolves in the session; only a question that genuinely needs its own resolution mode or owner graduates to the map.
- Name it precisely: the question, why conversation cannot settle it, the `resolution` label it should carry (`prototype`, `research`, or `grilling`), and whether it blocks the current branch.
- When it blocks the current branch, mint it now rather than stall the session: create the child Decision Issue with its `resolution` label, point the deferred branch's `blockedBy` edge at this new decision, and mark that branch deferred until the new decision clears. This single blocking spin-off is the one issue this skill creates; leave broader map-shaping to `map-decisions`.
- When it is independent, do not create it here. Hand it back: name it in the summary and let `map-decisions` mint it when control returns to the map, and carry on with the current branch.

## Completion criteria

Complete the grilling session when:

- The plan's goal and non-goals are clear.
- Every Design Tree branch that could change scope, system boundaries, data ownership, state, security, or an expensive dependency has been resolved or named.
- Blocking decisions are resolved or explicitly deferred.
- Key terms are aligned with `LANGUAGE.md`.
- ADR-worthy decisions have been identified.
- Each remaining uncertainty has an owner or a named next workflow.

End with a compact decision summary, explicit deferrals, any branches handed back to the map, doc changes, ADR candidates, and the next recommended action. Return to `map-decisions` when other mapped branches remain, or when a handed-back branch needs to be minted onto the map. Suggest `write-issues` when the settled scope is ready to become Feature Issues.
