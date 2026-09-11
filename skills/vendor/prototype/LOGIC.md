# Logic prototype

Use this branch for state machines, workflows, data-model behavior, business rules, or other non-visual questions.

## Shape

Prefer:

- A small pure module containing the logic being tested.
- A thin interactive shell, CLI, script, or terminal UI that exercises the cases.
- Printed state after every action.

## Requirements

- One command to run.
- In-memory state by default.
- Clear list of scenarios to try.
- Minimal dependencies.
- No production persistence unless that is the question.

## Good questions

- Does this state model cover the real workflow?
- Which transitions are invalid?
- What edge cases feel awkward?
- What data must be derived vs stored?
- Does this sequence expose missing domain language?

## Finish

Capture the verdict in the relevant issue, ADR, living doc, or handoff. Then delete the shell or absorb the validated logic into production code.
