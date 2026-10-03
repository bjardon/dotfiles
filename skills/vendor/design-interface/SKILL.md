---
name: design-interface
description: Propose the interface for a piece the user explicitly told you to build, as stubs on the branch, and get it approved before implementation. Use after that go-ahead when the piece adds or changes a module interface, or when a delivery loop reaches its Design step. Never use during planning.
license: MIT
---

# Design the interface before building

Turn the piece the user asked you to build into an interface the user approves before any implementation exists. The interface lands as code on the branch, so the approval is a diff and the implementation that follows has a fixed shape to fill.

## Confirm the go-ahead

Run only for a piece the user has explicitly told you to build. That go-ahead is a plain instruction naming the Feature Issue or scope to build now. An accepted plan or your own proposal is not one. Without it, the work is still in planning: say so and stop.

Check that the piece is ready: every `blockedBy` points at done work, every decision it depends on is resolved, its acceptance criteria are written down and reflect those decisions, and setup only the user can do is named. Name any condition that fails and pause until it is fixed or the user says to continue anyway.

## Decide whether the piece needs a design

Read the accepted source, its acceptance criteria, the project's Agent Guidance, `LANGUAGE.md`, the coding-standards Project Recipe that Agent Guidance points to (usually `docs/coding-standards.md`), and the code the piece touches.

The piece needs a design when it adds a module or changes what callers of an existing module must know. When it changes only the implementation behind interfaces that stay the same, report that no interface changes and stop. The skip is the answer.

## Design deep modules

A **module** is anything with an interface and an implementation, from a function to a package. Its **interface** is everything a caller must know to use it correctly: types and signatures, and also invariants, ordering constraints, error modes, and required configuration. A module is **deep** when a lot of behavior sits behind a small interface, and **shallow** when the interface is nearly as complex as what it hides. The **seam** is where the interface lives.

Aim for depth:

- Keep the entry points few and the parameters simple. Hide complexity inside rather than exposing it to every caller.
- Apply the deletion test: if deleting the module would only remove a pass-through, it is not earning its interface. If the complexity would reappear in every caller, it is.
- Treat the interface as the test surface. Tests cross the same seam as callers. Needing to test past the interface means the module is the wrong shape.
- Accept dependencies instead of creating them, and return results instead of producing hidden side effects.
- Add a seam only where something actually varies across it. One adapter is a hypothetical seam; two make it real.

Follow the coding-standards recipe for the patterns the interface uses. Without one, match the patterns of the surrounding code. Use the project's Language for names.

When the right shape is not obvious, sketch two substantially different interfaces, keep the deeper one, and mention the other in the proposal.

## Write the interface as code

Write, in one commit on the piece's branch:

- Types, signatures, and module entry points as the language expresses them, with doc comments stating invariants, ordering constraints, and error modes.
- Bodies that fail loudly when called, such as raising a not-implemented error.
- Tests named for the behavior each acceptance criterion needs at the interface, marked pending or skipped so they run without failing.

The project's checks still pass on this commit. Follow the project's commit convention, and add the agent as co-author.

## Get approval

Present the proposal and wait:

- The commit and its diff.
- Each module, what it hides, and why its interface is small.
- The pending tests and the acceptance criteria they cover.
- The alternative you set aside, when you sketched one.
- Decisions you made that the accepted source did not settle.

The user approves, or asks for changes. Revise on the same branch and present again. Once approved, report the approved commit so implementation and review can compare against it. A later change to the approved interface pauses for the user.

Pause instead of proposing when the interface would require a product-scope change, a hard-to-reverse architecture decision, a new paid service or external vendor, risk to persisted data, a change to authentication, permissions, secrets, or other security-sensitive behavior, or a broad refactor outside the piece.

## Finish

Finish when the user has approved the interface commit, or when you reported that the piece changes no interface. Report the approved commit, the modules it defines, and the pending tests implementation must fill.
