# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frollz is a full-stack film photography tracking application — a monorepo with two independently containerized services:
- **frollz-api**: NestJS REST API (port 3000) backed by PostgreSQL 18
- **frollz-ui**: Vue 3 SPA (port 5173) served through Nginx

All traffic goes through Nginx on port 80, which proxies `/api/` to the API and `/` to the UI.

## Commands

### Docker (primary development workflow)

```bash
docker-compose up -d          # Start all services (Nginx, PostgreSQL, API, UI)
docker-compose down           # Stop all services
docker-compose logs -f        # Tail logs
```

After code changes: rebuild and restart the relevant container(s).

### Backend (frollz-api)

```bash
npm run build           # Compile TypeScript to dist/
npm run start:dev       # Watch mode dev server
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format
npm test                # Run unit tests (Jest)
npm run test:watch      # Jest watch mode
npm run test:cov        # Coverage report
npm run test:e2e        # End-to-end tests
```

### Frontend (frollz-ui)

```bash
npm run dev             # Vite dev server (port 5173)
npm run build           # Production build
npm run type-check      # Vue TSC type validation
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format
npm run test            # Vitest unit tests
```

## Codebase Memory MCP

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
