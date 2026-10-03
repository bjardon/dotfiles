# Pull request template

Use this as the project's `.github/PULL_REQUEST_TEMPLATE.md`, or the equivalent for its code host, once the project uses pull requests. Each comment tells the author when a section can go. Add a slot for a review bot's summary when the project uses one.

```md
## Summary

<!-- What changed. Link the issue, Decision Issue, or ADR that holds the reasoning instead of restating it. -->

## Diagram

<!-- Remove this section unless the change adds or changes a boundary, a data flow, or a state transition. Use Mermaid. -->

## Verification

<!-- Each acceptance criterion with its evidence. Steps for the reviewer on any criterion the author could not exercise. -->

## Delivery record

<!-- Remove this section when no agent ran the review loop. Otherwise: review rounds, Findings fixed by tier and severity, escalations, deferred nits, and fixes made after the pull request opened. -->

## Guardrail candidates

<!-- Remove this section when the change created or added to no Guardrail Candidate. -->

## Approved deviations

<!-- Remove this section when there are no approved deviations. -->
```
