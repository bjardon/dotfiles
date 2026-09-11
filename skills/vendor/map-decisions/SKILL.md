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

Every decision issue carries `type: decision`. Add a `resolution` label saying how it resolves, and resolve it through that workflow rather than ad hoc: `grilling` for a Grilling Session (the `grill` skill, one question at a time), `prototype` for a throwaway artifact (the `prototype` skill), or `research` for away-from-keyboard digging that records sources and conclusions. A question settled in conversation needs no `resolution` label.

Each Decision Issue should state the question, why it matters, known constraints, credible options, the current recommendation when one exists, resolution criteria, consequences, and references.

Keep full reasoning in the child issue. When it resolves, add a short linked resolution to the parent map. Use `write-adr` when the accepted answer is hard to reverse, surprising, and resulted from a real trade-off.

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
