# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

Frollz is a self-hosted film photography tracker — NestJS API + Vue 3 SPA monorepo, deployed as a single container backed by PostgreSQL 18. In development, the API uses SQLite automatically (`NODE_ENV=development`).

## Critical: Docker command

Always use `docker compose` (plugin), never `docker-compose` (legacy). `docker-compose` will fail.

## Key commands

```bash
# API (frollz-api/)
npm run start:dev        # dev server — SQLite, no setup needed
npm test                 # unit tests
npm run test:integration # integration tests
npm run lint             # ESLint + auto-fix

# UI (frollz-ui/)
npm run dev              # Vite dev server, port 5173, proxies /api → localhost:3000
npm run test             # Vitest
npm run type-check       # Vue TSC
npm run lint             # ESLint + auto-fix
```

## Codebase exploration — MCP first

Use `codebase-memory-mcp` tools for all structural questions. Do NOT reach for Grep/Glob/Bash find.

- `get_architecture` — orientation
- `search_graph` — find functions/classes by name
- `trace_path` — callers / callees
- `detect_changes` — blast radius from git diff
- `get_code_snippet` — read source with context
- `search_code` — text search (replaces grep)

Fall back to Read/Grep only for raw file content (config values, line ranges).

## GitHub issue workflow

**Before any new work — no exceptions:**

```bash
git checkout development && git fetch origin && git pull origin development
git checkout -b feature/{issue-number}-{issue-title-slug}
```

Use the `/feature-dev` skill to run the full workflow.

## Rules

1. **Never work directly on `main`.**
2. **Wait for user approval before submitting or merging a PR** — do not auto-merge.
3. Target branch for PRs is always `development`.
4. `docs/adr/architecture.md` must be updated for any architectural change.
5. Use `/clear` between unrelated tasks to keep context clean.
6. Use subagents for codebase investigation — keeps file reads out of main context.

The `codebase-memory-mcp` server is installed, connected, and **must be used** for all structural code exploration. The graph is automatically kept up-to-date after every file edit. Always prefer graph queries — they are faster and more accurate than file scanning.

**ALWAYS use MCP tools instead of Grep/Glob/Read for any structural question** (finding functions, tracing calls, understanding architecture, impact analysis, etc.). Only fall back to Read/Grep for viewing raw file content that the graph doesn't expose.

Key tools:
- `get_architecture` — start here for codebase orientation (entry points, hotspots, clusters)
- `search_graph` — find functions, classes, or symbols by name pattern
- `trace_call_path` — find callers/callees of a function (direction: `inbound` or `outbound`)
- `detect_changes` — map git diffs to affected symbols and blast radius
- `get_code_snippet` — retrieve source with metadata (signature, complexity, callers/callees)
- `query_graph` — Cypher-like queries for complex relationship analysis
- `search_code` — regex text search across files (replaces grep)

The graph is always current — no need to run `index_repository` manually.

## Architecture

### Backend (NestJS + PostgreSQL)

Each domain (film-format, stock, roll, tag, roll-state, stock-tag) is a self-contained NestJS feature module with the structure: `controller / service / module / dto / entities`.

`DatabaseService` is the single point of PostgreSQL access — all modules depend on it. It wraps `pg`, exposes a `query<T>(sql, params)` method and `execute(sql, params)` method used by all feature services. Tables are created via `CREATE TABLE IF NOT EXISTS` DDL on startup.

Default seed data is embedded in Knex migrations and loaded into `*_default` shadow tables on first run. Two tiers: **system data** (e.g. auto-managed tags: `expired`, `pushed`, `pulled`, `cross-processed`) is always copied to main tables on startup; **convenience data** (film formats, stocks, tags, stock-tags) is only copied when `DISABLE_DEFAULT_DATA_IMPORT` is not set.

A `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true` is applied globally. Swagger docs auto-generated at `/api/docs`.

### Frontend (Vue 3 + Vite + Pinia + Tailwind)

All HTTP calls go through `src/services/api-client.ts` (Axios-based). Views never call fetch directly.

Five routes map to domain views: `/` (dashboard), `/stocks`, `/rolls`, `/formats`, `/tags`. Shared components in `src/components/` include `TypeaheadInput.vue`, `SpeedTypeaheadInput.vue`, and `NavBar.vue`.

### Environment Variables

| Variable | Service | Default |
|----------|---------|---------|
| `POSTGRES_HOST` | API | `postgres` |
| `POSTGRES_PORT` | API | `5432` |
| `POSTGRES_DATABASE` | API | `frollz` |
| `POSTGRES_USER` | API | `frollz` |
| `POSTGRES_PASSWORD` | API | `frollz` |
| `PORT` | API | `3000` |
| `VITE_API_URL` | UI | `/api` (Docker) or `http://localhost:3000` (local) |

## Workflow

### Local Setup (required once per clone)

```bash
git config core.hooksPath .githooks
```

This activates the pre-commit hook at `.githooks/pre-commit`, which runs UI lint, UI type-check, UI tests, API lint, API tests, and Semgrep SAST before every commit. This mirrors CI exactly — if the hook passes, CI will pass.

### GitHub Issues

**Before starting any work on a new issue, always run these steps in order — no exceptions:**

```bash
git checkout development
git fetch origin
git pull origin development
git checkout -b feature/{issue-number}-{issue-title-slug}
```

Branch naming rules:
- Format: `feature/{issue-number}-{issue-title-slug}` (e.g. `feature/55-roll-state-transitions`)
- Slugify the issue title: lowercase, spaces → hyphens, remove special characters
- Use `fix/` prefix only for pure bug fixes unrelated to a feature issue

Additional rules:
1. After changes: build components and restart containers. If successful, commit and push all changed files.
2. **Wait for approval before submitting a PR** — do not auto-merge or auto-create PRs.
3. Prefer `gh` CLI for git operations.

### Review Checklist (after every code change)

- Before modifying existing functionality, run `detect_changes` to understand blast radius and identify affected callers
- All modified code has unit tests and all tests pass
- All code passes linting rules (`npm run lint`)
- Code has been simplified with readability in mind
- `docs/adr/architecture.md` is updated to reflect any architectural changes, so context can be quickly rebuilt in future sessions

### Context Preservation

If the session is compacted mid-task, a summary is automatically written to `/tmp/claude-frollz-state.md`. Read this file at the start of a resumed session to restore context.
