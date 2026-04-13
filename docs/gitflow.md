# Git Workflow (GitFlow)

Frollz uses a GitFlow-based branching strategy. This document describes the branch structure, the rules for each branch type, and the step-by-step process for features, releases, and hotfixes.

---

## Branch Structure

| Branch | Purpose | Source | Merges into |
|---|---|---|---|
| `main` | Production-ready code only. Always tagged. | — | — |
| `develop` | Integration branch. All feature work lands here first. | `main` | — |
| `feature/*` | Individual features or issues. | `develop` | `develop` |
| `release/*` | Release preparation. Version bumps, final fixes. | `develop` | `main` + `develop` |
| `hotfix/*` | Urgent production fixes. | `main` | `main` + `develop` |

**Never commit directly to `main` or `develop`.**

---

## Feature Workflow

Standard flow for all new features and bug fixes.

```bash
# 1. Start from a fresh develop
git checkout develop
git fetch origin && git pull origin develop

# 2. Branch off develop
git checkout -b feature/{issue-number}-{slug}
# e.g. feature/271-add-lens-tracking

# 3. Do your work, commit with conventional commits
# feat(scope): description
# fix(scope): description
# chore(scope): description

# 4. Open a PR targeting develop (not main)
# Title should match the conventional commit format
# e.g. "feat(#271): add lens tracking to roll detail"

# 5. After review, merge the PR (merge commit or squash — your choice)
# Delete the feature branch after merge
```

### Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(#123): short description of what was added
fix(#456): what was broken and how it was fixed
chore: update dependencies
refactor(rolls): simplify state machine transitions
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `build`, `perf`, `a11y`

---

## Release Workflow

When `develop` has enough work to ship, cut a release branch.

```bash
# 1. Cut the release branch from develop
git checkout develop
git fetch origin && git pull origin develop
git checkout -b release/1.3.0

# 2. Bump the version (package.json files, etc.)
# Make any last-minute release-prep commits here
# No new features on this branch — only version bumps and release notes

# 3. Push and open a PR: release/1.3.0 → main
git push -u origin release/1.3.0
# PR title: "Release v1.3.0"

# 4. After PR is approved, merge into main using fast-forward
git checkout main
git fetch origin && git pull origin main
git merge --ff-only release/1.3.0
git push origin main

# 5. Tag the release on main
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0

# 6. Merge the release branch back into develop
# (carries back any version bump commits)
git checkout develop
git merge --no-ff release/1.3.0
git push origin develop

# 7. Delete the release branch
git push origin --delete release/1.3.0
git branch -d release/1.3.0
```

Pushing the tag triggers the CI/CD pipeline, which builds and publishes the Docker image and creates a draft GitHub Release with auto-generated notes. The notes are populated from **PR titles merged to `main`** since the previous tag — which is why the fast-forward merge matters: it brings all feature PR titles into `main`'s history.

### After the release

Review and publish the draft release on GitHub. The auto-generated notes will be categorized by PR label (configured in `.github/release.yml`).

---

## Hotfix Workflow

For urgent production issues that cannot wait for the next release cycle.

```bash
# 1. Branch off main (not develop)
git checkout main
git fetch origin && git pull origin main
git checkout -b hotfix/describe-the-fix
# e.g. hotfix/fix-null-pointer-on-roll-create

# 2. Fix the issue, commit
# fix(scope): description of the fix

# 3. Push and open a PR: hotfix/* → main
git push -u origin hotfix/describe-the-fix

# 4. After review, fast-forward merge into main
git checkout main
git merge --ff-only hotfix/describe-the-fix
git push origin main

# 5. Tag the patch release
git tag -a v1.2.1 -m "Hotfix v1.2.1"
git push origin v1.2.1

# 6. Merge the hotfix back into develop
git checkout develop
git merge --no-ff hotfix/describe-the-fix
git push origin develop

# 7. Delete the hotfix branch
git push origin --delete hotfix/describe-the-fix
git branch -d hotfix/describe-the-fix
```

---

## Why fast-forward into main?

GitHub's `--generate-notes` builds release notes from commits and PR titles visible in `main`'s history between two tags. If you use a merge commit (`--no-ff`) for the release PR, GitHub only sees one PR — "Release v1.3.0" — and the release notes are useless.

Fast-forward (`--ff-only`) replays all commits from the release branch onto `main` linearly, so every feature PR appears in the notes.

---

## Branch protection rules (manual setup required in GitHub)

These cannot be set from the CLI and must be configured in **Settings → Branches** on GitHub:

| Branch | Rules to enable |
|---|---|
| `main` | Require PR before merging, require status checks (CI), no direct pushes, require linear history |
| `develop` | Require PR before merging, require status checks (CI), no direct pushes |

Setting "Require linear history" on `main` enforces the fast-forward-only merge requirement automatically.

---

## PR label conventions

Labels drive the auto-generated release notes categories (`.github/release.yml`). Apply at least one label to every PR:

| Label | Use for |
|---|---|
| `feature` / `enhancement` | New functionality |
| `bug` / `fix` | Bug fixes |
| `a11y` / `accessibility` | Accessibility improvements |
| `performance` | Performance improvements |
| `chore` | Maintenance, dependency updates |
| `refactor` | Internal code changes with no user-visible effect |
| `ci` | CI/CD pipeline changes |
