---
name: commit
description: Create a conventional commit for this project. Auto-detects scope from changed files, enforces the commit format required for GitHub release changelogs. Use after every logical unit of work.
model: haiku-4.5
---

# Commit Skill — Conventional Commits for Frollz

Create a conventional commit following this project's required format.

## Format

```
type(scope): imperative description

Closes #123
```

## Step 1 — Detect Changes

Run `git diff --staged --name-only` (and `git diff --name-only` for unstaged). Identify which packages and domains are touched.

## Step 2 — Determine Scope

Map changed files to scope:

| Files changed | Scope |
|---|---|
| `packages/shared/` | `shared` |
| `apps/api/src/domain/film/` or `modules/film/` or `infrastructure/persistence/film/` | `film` |
| `apps/api/src/domain/emulsion/` or similar | `emulsion` |
| `apps/api/src/domain/camera/` or similar | `camera` |
| `apps/api/src/domain/transition/` or similar | `transition` |
| `packages/api-client/` | `api-client` |
| `apps/web/src/` or `apps/web/app/` | `web` |
| `apps/api/src/infrastructure/migrations/` | `db` |
| `apps/api/src/app.module.ts` | `api` |
| `.github/` or CI files | `ci` |
| `turbo.json`, `pnpm-workspace.yaml`, config files | `tooling` |
| `docs/` | `docs` |

If multiple unrelated scopes are touched, consider whether this should be split into multiple commits. If they are tightly related (e.g., shared + api + web for one feature), use the primary domain scope.

## Step 3 — Determine Type

| Type | When |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, tooling |
| `docs` | Documentation only |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace (no logic change) |

## Step 4 — Write Description

- Imperative mood: "add", "fix", "remove", "update" — not "added", "fixes", "removes"
- No period at end
- Under 72 characters for the first line
- If there's a GitHub issue, include `Closes #N` in the body

## Step 5 — Stage and Commit

Stage relevant files explicitly (not `git add -A` blindly — avoid accidentally committing `.env` or build artifacts).

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
type(scope): imperative description

Closes #N
EOF
)"
```

## Verification

After committing, run `git log --oneline -3` to confirm the message looks right.
