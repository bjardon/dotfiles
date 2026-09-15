# Agent guide

This repo tracks my Mac's configuration files, so a fresh machine can be restored
from a clone. See [README.md](README.md) for the full picture.

Each area is self-contained: it vendors its own files, documents its own restore
steps, and owns any tooling it needs. Skills and global agent instructions follow
this pattern.

## Working here

- Prefer explicit, version-controlled config over anything fetched at restore time.
  Vendor upstream files rather than pointing at a moving branch, and pin the exact
  version you copied.
- Keep every local change visible in Git. Never silently refresh vendored files
  from upstream.
- Restore steps must be safe to re-run and must back up whatever they replace
  instead of overwriting it.
- Read an area's own README before changing it, and run its checks before you
  commit.
- Credentials, company settings, caches, and session history stay out of this repo.

## Landing changes

Changes reach `main` through a squash-merged PR, never a direct push. Work on a
branch (a worktree per agent session keeps diffs isolated), commit as you go, open
a PR, and squash-merge it. That is the whole process. Keep it light:

- PR title is the change in one line, same as the squash commit.
- PR body is 0 to 3 bullets, and only when the title does not say enough. No
  Summary, Motivation, or Test plan scaffolding, no section headers, no emoji.
- No labels, milestones, assignees, or review requests. It is a solo repo.
- Squash-merge and delete the branch. One commit per landed change keeps history
  linear.

Do not add process beyond this. The point is isolated diffs, not paperwork.

## Commands

Commands are per-area and defined in that area's tooling (for skills, the package
scripts in [package.json](package.json)). Check the relevant README for the current
set rather than assuming one here.
