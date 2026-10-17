---
name: reconcile-tracker
description: Reconcile a Linear project with what is true, report what is unblocked and what waits on the user, and post a project status update. Use when the user asks what's next or where things stand, after a planning session, or at the end of a build.
license: MIT
---

# Reconcile the tracker

Make one Linear project's relations and status match what is true, then report where it stands. Correct what the evidence settles. Raise judgments with the user and leave them unmade.

Reconcile relations and status only. Labels, milestone assignment, and issue structure belong to other work. Priority and triage belong to the user. Linear's GitHub integration owns status driven by pull requests. Creating issues and Decision Maps belongs to planning.

## Gather the project

Read the Linear team and project from `AGENTS.md`, and whether it records the project as a Client Engagement. When the team or project is missing, that is a setup gap: route to `init-agent-os` or `adopt-project` instead of guessing. When `AGENTS.md` records a different tracker for this project (a client exception), reconcile there instead, using that tracker's equivalent projects, relations, statuses, and status updates. Report any step it has no equivalent for as waiting on the user.

Load every issue in the project outside Triage, Canceled, and Duplicate, with its status, milestone, parent, relations, linked pull requests, and body. Read comments where an issue's evidence may live there.

Several projects can share one team, so an issue id does not say which project it belongs to. Confirm the project of every issue an evidence passage mentions before treating it as a dependency.

Find the active Milestones: the first unfinished Milestone in the project's milestone order, plus any later Milestone with started or done work. A Milestone is unfinished while any of its issues is open.

## Find drift

Drift is any place the tracker disagrees with the evidence. Check every issue in the active Milestones, every issue without a Milestone that blocks one of them, every issue a planning session or build just touched, and every issue in Todo.

Relations:

- An issue's body or comments state a dependency on another issue in the project ("needs X first", "after X", "input from X", an `Open decisions` link), and no `blockedBy` records it.
- A `related` link joins two issues whose text describes one waiting on the other. A related link records association, never order.
- By its content, one issue cannot be built before another in the project, and nothing records it. This is an inferred dependency.
- An issue added after the original plan has no relations to the issues it depends on or blocks.

Status:

- A Decision Issue is still open after its resolution was recorded on its Decision Map's `Resolved decisions`.
- A merged pull request did an issue's work but never named the issue, so the automation never moved it.
- An issue is In Progress with no linked pull request and no comment saying where its work lives.
- An issue looks obsolete after later work, or duplicates another.

Todo holds exactly the unblocked issues in scope: open issues in the active Milestones, or without a Milestone and blocking one of them, whose every `blockedBy` is done. Everything else that is not started waits in Backlog. Drift here is an unblocked issue in scope still in Backlog, or an issue in Todo that is out of scope or has an open blocker. Compare against the graph after the relation corrections are written, and move only issues in Backlog or Todo.

In a Client Engagement, also check that each active Milestone ends with an Acceptance Issue, that the next Milestone's first issues are blocked by it, and that every accepted revision in the Milestone blocks it.

Across projects:

- An issue's text names an issue in another project with dependency wording. Raise it.
- Drop any cross-project dependency you only inferred, without reporting it. Cross-project relations are written deliberately while planning.

## Sort corrections from judgments

A correction is drift the evidence settles:

- Adding a missing `blockedBy` inside the project, stated or inferred.
- Replacing a `related` link with `blockedBy` for the same pair.
- Setting Done on an issue whose outcome another artifact already records, such as a Decision Map's `Resolved decisions`.
- Linking a merged pull request to the issue whose work it did, so the automation moves the issue.
- In a Client Engagement, adding the `blockedBy` edges around an Acceptance Issue.
- Moving an issue between Backlog and Todo so Todo holds exactly the unblocked issues in scope. These moves follow from the recorded relations, so they skip review.

Everything else is a judgment for the user: cross-project dependencies stated in text, canceling an obsolete issue, marking a duplicate, moving an issue backward from a started state, an In Progress issue with no where-it-lives comment and no pull request, and calling any issue ready.

## Review corrections

Hand the proposed corrections to a reviewer in a separate context: a subagent, a fresh session, or another model. Give it each correction with its evidence, a quoted passage or a linked artifact, and the issues on both ends, never your reasoning. The reviewer answers agree, unsure, or disagree for each one.

Write the relation and Done corrections the reviewer agrees with, then make the Backlog and Todo moves against the resulting graph. Move every unsure or disagreed correction to the judgments, with the reviewer's reason. When no separate context is available, write only corrections whose evidence is a stated dependency or a recorded outcome, and move inferred ones to the judgments.

Write nothing outside the corrections above. Mark any comment you write visibly as agent-authored.

## Report

Report in conversation:

- **Unblocked.** For each active Milestone in order, the issues now in Todo, in the manual order the user set in the Milestone view. Say so when the tools cannot read that order. When an issue waits on an unblocked issue in another project, list that issue too and name its project. Call these issues unblocked. Ready is the user's judgment.
- **Corrected.** Each correction written, with its evidence.
- **Waiting on you.** Each judgment, with its evidence and the reviewer's reason when one exists.

Todo is only as current as the latest reconciliation. A blocker finishes when the user merges its pull request, which usually happens after `build` reconciled, so a dependent issue reaches Todo at the next reconciliation. When the user asks what's next, reconcile first; the board may be one merge behind.

## Post the status update

When anything changed since the project's latest status update, post a new one on the Linear project:

- What landed since the latest update.
- What is open in review.
- The unblocked issues, as reported above.
- What waits on the user, including every judgment.

Keep the latest update's health. The user sets it. Skip the post when nothing changed.

Finish when every issue in scope was checked for drift, every finding was written as a reviewed correction or reported as a judgment, the report is delivered, and the status update is posted or skipped because nothing changed.
