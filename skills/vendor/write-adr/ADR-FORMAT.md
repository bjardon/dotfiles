# ADR format

ADRs live in `docs/adr/` and use sequential numbering:

```text
docs/adr/0001-short-decision-slug.md
docs/adr/0002-another-decision.md
```

Create `docs/adr/` lazily, only when the first ADR is needed.

## When to create an ADR

Create or offer an ADR only when all three are true:

1. The decision is hard to reverse.
2. The decision would be surprising without context.
3. The decision is the result of a real trade-off.

If any condition is missing, do not create an ADR.

## Template

```md
# Short decision title

One to three sentences explaining the context, the decision, and why this trade-off was chosen.
```

That is enough for most ADRs.

## Optional sections

Add these only when they carry real value:

```md
---
status: accepted
---

## Considered options

- Option A: reason rejected.
- Option B: reason accepted.

## Consequences

- Important downstream effect.
```

## Numbering

Scan `docs/adr/` for the highest existing number and increment it by one. Do not renumber existing ADRs.

## Good ADR subjects

- Architectural shape.
- Integration patterns between contexts.
- Technology choices with meaningful lock-in.
- Ownership and boundary decisions.
- Deliberate deviations from the obvious path.
- Constraints not visible in code.
- Non-obvious rejected alternatives.
