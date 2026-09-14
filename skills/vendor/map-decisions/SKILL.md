---
name: map-decisions
description: Map and resolve the dependent decisions inside a body of work in Linear, either to discover Milestone boundaries or to decompose an accepted Milestone. Do not use when there are no substantial decisions or for ordinary implementation planning.
---

# Map decisions

Create a Decision Map in Linear that makes the decisions inside a body of work visible and organizes them until its shape is settled. Run it in one of two modes:

- **Discover.** The Milestone boundaries are unclear. The map explores whether the work is one Milestone or a sequence, and surfaces the decisions that shape them.
- **Decompose.** The Milestone is already accepted, such as a fixed iteration or MVP. The map surfaces and resolves the decisions inside that Milestone, then routes the feature decomposition to `write-issues`.

Name the mode from the state of the work before mapping. Use the workflow whenever a body of work carries dependent product or design decisions worth organizing, including an accepted Milestone that still holds unresolved decisions. Skip it only when there are no substantial decisions to map; resolve a single obvious question in conversation. A Decision Map organizes questions and records accepted answers. It does not invent resolutions, create Feature Issues, or authorize implementation.

## Gather the proposed work

Read only the context needed to identify decisions:

- The current conversation and accepted intake summary.
- Relevant `LANGUAGE.md` files, ADRs, and Living Docs.
- Existing code when it establishes current behavior or constraints.
- Related tracker items when they may overlap with the proposed work.

Keep accepted facts separate from assumptions. In Discover mode, treat possible Milestones as candidates until the decisions that shape them are resolved. In Decompose mode, treat the accepted Milestone as fixed and organize the decisions under it.

## Use the Linear tracker

Read the Linear team and project from `AGENTS.md`, recorded by project setup (`init-agent-os` or `adopt-project`). If either is missing, that is a setup gap: route to `init-agent-os` or `adopt-project` rather than choosing it here. If `AGENTS.md` records a different tracker for this project (a client exception), create the map there instead, following that tracker's equivalent conventions.

Create the Decision Map as a parent issue with the `type: decision` label. Its child Decision Issues also carry `type: decision`, plus a `resolution` label when they need a workflow (see below). Do not save a copy in the repo.

## Create the map

Include only sections that carry real content:

```md
# Map decisions for <proposed outcome>

Status: Draft

## Proposed outcome

## Current boundaries

## Accepted constraints

## Decision branches

## Candidate Milestones

## Resolved decisions

## Resulting Milestones

## Deferred questions

## References
```

`Candidate Milestones` and `Resulting Milestones` belong to Discover mode. In Decompose mode the Milestone is fixed: name it in `Proposed outcome` and omit both sections.

Map the decisions that can change product scope, user-visible behavior, system or domain boundaries, data ownership, state transitions, security, external dependencies, or costly-to-reverse choices. Leave reversible implementation details to `implement`.

Order branches by dependency. Identify the branch that blocks the most downstream decisions first.

## Split only substantial decisions

Keep small questions in the Decision Map and record their explicit resolution there. Create a child Decision Issue only when one question needs its own Grilling Session, research effort, prototype, or owner.

Every decision issue carries `type: decision`. Add a `resolution` label saying how it resolves, and resolve it through that workflow rather than ad hoc: `grilling` for a Grilling Session (the `grill` skill, working the design tree in rounds), `prototype` for a throwaway artifact (the `prototype` skill), or `research` for away-from-keyboard digging that records sources and conclusions. A question settled in conversation needs no `resolution` label.

Each Decision Issue should state the question, why it matters, known constraints, credible options, the current recommendation when one exists, resolution criteria, consequences, and references.

Keep full reasoning in the child issue. When it resolves, add a short linked resolution to the parent map. Use `write-adr` when the accepted answer is hard to reverse, surprising, and resulted from a real trade-off.

## Work through the map

Resolving mapped decisions is a distinct invocation from charting: the map already exists and the user points at it, or at a single Decision Issue. A named issue is optional — without one, pick the next decision rather than asking which.

1. Load the map at low resolution, not every child issue body.
2. Choose the decision. If the user named one, first confirm its blocking decisions are resolved; when any remain open, resolve the next open blocker in dependency order, or defer the named decision until they clear. Otherwise take the next unresolved branch in dependency order, skipping any whose blocking decisions are still open.
3. Load the selected Decision Issue's full body first, so its question, constraints, and criteria are in hand rather than just its title; a no-label question carries none, as its text lives on the map. Then dispatch on the `resolution` label rather than resolving ad hoc: `grilling` runs the `grill` skill, `prototype` runs the `prototype` skill, `research` runs an away-from-keyboard research pass that records its sources and conclusion. Confirm with the user before dispatching to `prototype`: building one enters build mode, which a bare request to resolve the map does not authorize. A decision with no `resolution` label is small enough to settle in conversation here.
4. Record the outcome. When the branch resolved, keep the full reasoning in its child Decision Issue and add a linked one-line resolution to the parent map's `Resolved decisions`; a question carrying no `resolution` label records its reasoning and resolution on the map itself. When the workflow instead handed a branch back — because it surfaced a question needing a prototype, research, or its own resolution — record the deferral rather than a resolution, note any blocking spin-off the workflow already minted, and carry any independent handed-back question into the next step. Reconcile any constraint the outcome hands to a sibling decision, and use `write-adr` when a resolved answer is hard to reverse, surprising, and the product of a real trade-off.
5. Graduate newly-specifiable decisions into the map, including the independent questions a Grilling Session handed back: create each as a child Decision Issue with the right `resolution` label, and when it blocks a deferred branch point that branch's `blockedBy` edge at the new decision and keep the branch deferred until it clears. A Grilling Session mints its own blocking spin-off, so adopt that issue into the map rather than recreating it. Re-order the remaining branches when the outcome changed their dependencies.

Resolving a decision produces a decision, not an implementation. Grouping the resulting repository changes into pull requests and building features are separate steps, routed after the map settles.

## Settle the Milestone shape

A Milestone is a bounded outcome that can be accepted, sequenced, and declared complete.

**Discover mode.** The proposed work may become one Milestone or several. Replace candidate Milestones with the resulting Milestone or sequence, and do not preserve the original feature boundary when the decisions show another sequence is clearer.

**Decompose mode.** The Milestone is already accepted, so do not re-derive its boundary. Organize the decision branches under it, and route the feature decomposition to `write-issues`.

Blocking decisions must resolve before their affected Milestone becomes accepted scope. A deferred question may remain only when it does not threaten that Milestone's outcome or boundaries.

## Amend accepted scope

A decision can change scope the Milestone or its source brief already accepted, such as pulling work in or dropping it. This is a product-scope change, so get the user's explicit go-ahead rather than silently widening or narrowing the Milestone. Record the amendment in the map, stating what changed, from what to what, and why. Reconcile the upstream source that defined the scope, such as an External Project Brief, in the same pass when it is editable. When it cannot be updated, record the superseding decision and its provenance instead, so the source stops contradicting the accepted work.

## Keep tracker and Git structure separate

A Decision Map and its Decision Issues create no Git branches by default. When accepted decisions change `LANGUAGE.md`, ADRs, or Living Docs, group repository changes into focused, coherent pull requests according to the target repo's workflow. Do not create a branch per Decision Issue or keep a long-lived branch open merely because the map remains active.

## Keep the map active and route the work

Finish the initial mapping pass when no material decision branch is hidden, the branches are ordered by dependency, each unresolved branch has a named resolution workflow, and candidate Milestones are clearly marked as provisional. Leave the Decision Map active while its blocking decisions remain unresolved.

After every blocking decision is resolved or explicitly deferred outside the affected Milestone, settle the outcome: in Discover mode, replace candidate Milestones with the resulting Milestone or sequence; in Decompose mode, the fixed Milestone stands. Link the resulting work to its accepted source. Route to `write-issues` to decompose it into the feature tree, or `implement` when the user tells the agent to build a specific piece directly. Close the Decision Map after its resulting work is linked and no blocking decision remains hidden.
