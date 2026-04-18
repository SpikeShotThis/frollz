---
name: pr
description: Open a draft pull request from the current feature branch to develop. Generates a changelog-ready description following the project's conventional commit style. Use when a feature is complete and ready for review.
---

# PR Skill — Open Pull Request to Develop

Open a draft PR from the current branch to `develop` with a structured, changelog-ready description.

## Pre-flight Checks

1. Confirm the current branch is NOT `main` or `develop`
2. Run `git status` — no uncommitted changes should remain
3. Run `pnpm check-types` and `pnpm lint` from repo root — fix any failures before opening the PR

## Step 1 — Gather Context

```bash
git log develop..HEAD --oneline          # all commits in this branch
git diff develop...HEAD --stat           # files changed
```

Read the commit log to understand the full scope of changes. Do not just look at the latest commit.

## Step 2 — Push Branch

```bash
git push -u origin HEAD
```

## Step 3 — Compose PR Description

Use this structure:

```markdown
## Summary

- <bullet: what was built and why>
- <bullet: key design decisions or tradeoffs>
- <bullet: any migrations or breaking changes>

## Changes

- `packages/shared` — <schema changes if any>
- `apps/frollz-api` — <API changes>
- `apps/frollz-ui` — <UI changes>
- `apps/frollz-api/migrations/` — <migration summary if any>

## Test Plan

- [ ] Run `pnpm migrate` and verify migration applies cleanly
- [ ] Manual test: <golden path for the feature>
- [ ] Manual test: <edge case>
- [ ] Run `pnpm test` — all tests pass
- [ ] Run `pnpm check-types` — no type errors
- [ ] Run `pnpm lint` — no lint errors

## Closes

Closes #<issue-number>
```

## Step 4 — Create Draft PR

```bash
gh pr create \
  --title "<type>(<scope>): <imperative description>" \
  --body "$(cat <<'EOF'
<body from step 3>
EOF
)" \
  --base develop \
  --draft
```

PR title must follow conventional commit format: `feat(camera): add camera selection on roll load`

## Step 5 — Output

Return the PR URL so the user can review it. Remind the user: **do not merge without approval**.
