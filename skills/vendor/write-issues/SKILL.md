---
name: write-issues
description: Turn accepted scope into a tree of Feature Issues in Linear, each a nested vertical slice.
disable-model-invocation: true
---

# Write issues

Start after the target outcome and its main boundaries are clear and settled in conversation, grilling, prototyping, or a Decision Map.

A Feature Issue names a user-recognizable or system-owner-visible outcome, and is cut as a **vertical slice** through the stack that can be verified on its own. The title is a feature noun-phrase, not a user-story sentence or a technical task.

- Feature Issue = a vertical slice of behavior a user or system owner would recognize: "Owner Sign-up and Sign-in," "Services Management," "Public Booking."
- Sub-Issue = a smaller vertical slice nested under a larger feature when the parent is too big to build or sequence as one slice: "Availability Configuration" under "Tenant Configuration."
- A horizontal layer is not a Feature Issue. "Implement API," "build form," "add route," "write database schema," and "slot generation & display" on its own are not slices. Slots you cannot book yet cannot be verified on their own. Layers stay inside the coding agent's implementation plan for a slice.

The coding agent decides the technical tasks inside a slice. The tracker stays readable for non-technical collaborators.

## Cut vertical slices, nest shallowly

Each issue should deliver a usable, verifiable increment that spans whatever layers it needs, not one layer of many. Prefer the smallest slice that is still recognizable and verifiable on its own.

Nest the same way `map-decisions` nests: prefer shallow trees, and split a feature into Sub-Issues only when it is too big to build or sequence as one slice. Every issue, the parent included, stays an independently verifiable vertical slice; a parent is verified through the behavior its Sub-Issues compose. Add hierarchy only when it improves tracking.

Sequence with dependencies, not nesting. Record each dependency as a Linear `blockedBy` relation, so the order is visible. Linear does not hold a dependent issue closed on its own; the order you build them in honors the sequence. Issue nesting does not prescribe branches or pull-request targets.

## Aim to verify by using it

Aim for each slice to be verifiable by running the project and using the behavior it adds, however that project runs (a local dev server, a deployed preview, a CLI). Some slices are exercised directly; others by triggering the behavior and checking its effect, such as an email notification landing in the inbox. Keep each slice small enough to exercise on its own, and do not drop that aim for a slice that could meet it.

## Decisions are tracked too

Not all tracked work is a feature, and decisions are not folded into Feature Issues. Follow `map-decisions`: keep small questions in the parent Decision Map, and create a Decision Issue only when a question needs separate grilling, research, prototyping, or ownership. A hard-to-reverse, surprising, trade-off decision graduates to an ADR (`write-adr`).

## Workflow

1. Read the relevant project context, `LANGUAGE.md`, ADRs, and Living Docs.
2. Identify user-recognizable outcomes and cut each as a vertical slice.
3. Split an oversized slice into nested Sub-Issue slices only when the parent is too big to build or sequence as one.
4. Mark assumptions, and set dependencies in dependency order as Linear `blockedBy` relations.
5. Read the Linear team and project from `AGENTS.md`, where project setup has already recorded them.
6. Draft issues there, each with the `type: feature` label, and check each one against the rules below.

## Issue rules

A good issue:

- Names a user-recognizable or system-owner-visible outcome with a feature noun-phrase title.
- Is a vertical slice spanning the layers it needs, not a horizontal layer.
- Can be verified by running the project and using it.
- Has clear acceptance criteria and explicit `blockedBy` relations.
- Carries the `type: feature` label, assigned explicitly to a Sub-Issue too (Linear does not inherit labels).
- Avoids bundling unrelated user-facing behavior.
- Captures architectural assumptions without pretending they are settled decisions.

## Issue template

```md
# Feature noun-phrase title

## Outcome

The user-recognizable or system-owner-visible behavior this slice delivers, across the layers it spans.

### Out of scope

- Behavior deliberately excluded from this slice.

## Acceptance criteria

- Observable checks confirmed by running the project and using the slice.

## Assumptions

- Assumptions the agent may proceed with.

## Open decisions

- Unresolved decisions this slice depends on. Link the Decision Issue when one exists.

## Stop and ask if

- Pauses specific to this slice. Omit this section when none apply.
```

## Tracker

Issues live in Linear, in the team and project `AGENTS.md` records by project setup (`init-agent-os` or `adopt-project`), so an issue id resolves without repeating where it lives. If the team or project is missing, that is a setup gap: route back to `init-agent-os` or `adopt-project` rather than choosing it here. If `AGENTS.md` records a different tracker for this project (a client exception), write issues there instead, following that tracker's equivalent conventions. Give every Feature Issue the `type: feature` label, and assign it explicitly to each Sub-Issue too, since Linear does not inherit labels from a parent.

## Stop-and-ask intent

`Stop And Ask If` is for the coding agent that later picks up the slice. The universal pauses (product-scope changes, hard-to-reverse architecture, paid vendors, persisted-data risk, auth or secrets, broad refactors) already bind that agent through the delivery convention and `AGENTS.md`, so name only pauses unique to this slice here, and omit the section when there are none.

Finish when every issue meets the rules above, every accepted outcome has one home as a vertical slice, and the tree is as shallow as the work allows. A dependency-ready Feature Issue is ready to build; route to `implement` only when the user tells you to build it. Creating or accepting the issue is not that go-ahead.
