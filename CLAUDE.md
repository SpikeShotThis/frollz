# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frollz is a full-stack film photography tracking application — a self-hosted monorepo that ships as a single combined container (NestJS API + Vue SPA) backed by PostgreSQL 18.

- **Production**: one `frollz` container (port 3000) + `postgres`. NestJS serves `/api/*` and the built Vue SPA. Place a reverse proxy (NPM, Traefik, Caddy) in front for HTTPS.
- **Development**: separate `frollz-api` (port 3000, watch mode) + `frollz-ui` (port 5173, Vite HMR) + `postgres`. The Vite dev server proxies `/api` to the API container — no nginx needed.

## Commands

### Docker

> **IMPORTANT**: This environment uses `docker compose` (the plugin), **not** `docker-compose` (the legacy standalone binary). Always use the two-word form. `docker-compose` will fail with "command not found".

**Development** (hot reloading, separate containers):
```bash
docker compose -f docker-compose.dev.yml up -d    # Start API + UI + PostgreSQL
docker compose -f docker-compose.dev.yml down      # Stop all services
docker compose -f docker-compose.dev.yml logs -f   # Tail logs
```

**Production** (combined container, what self-hosters run):
```bash
docker compose up -d          # Start frollz + PostgreSQL
docker compose down           # Stop all services
docker compose logs -f        # Tail logs
```

To build the production image locally:
```bash
docker build -t frollz:local .
```

After code changes in dev: rebuild and restart the relevant container(s).

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

The `codebase-memory-mcp` server is installed, connected, and **must be used** for all structural code exploration. The graph is automatically kept up-to-date after every file edit.

### MCP-First Rule — No Exceptions

**ALWAYS use MCP tools for structural questions.** Do NOT reach for Grep, Glob, or Bash find commands to explore the codebase structure. These are slower, noisier, and can miss cross-file relationships that the graph captures instantly.

| Question type | MCP tool to use | Do NOT use |
|---|---|---|
| Where is function X defined? | `search_graph` | Grep |
| What calls function X? | `trace_call_path` (inbound) | Grep |
| What does function X call? | `trace_call_path` (outbound) | Grep |
| How is the codebase organized? | `get_architecture` | ls / find |
| What files changed and what's the blast radius? | `detect_changes` | git diff + Grep |
| Find all classes/functions matching a pattern | `search_graph` | Glob |
| Complex relationship queries | `query_graph` | multiple Greps |
| Regex search across file content | `search_code` | Grep |

Only fall back to Read/Grep for viewing **raw file content** that the graph doesn't expose (e.g., reading a specific line range to understand implementation detail).

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

`DatabaseService` is the single point of PostgreSQL access — all modules depend on it. It wraps Knex, exposes a `query<T>(sql, params)` method and `execute(sql, params)` method used by all feature services. Schema is managed via Knex migrations in `frollz-api/migrations/`; `DatabaseService.onModuleInit` runs `knex.migrate.latest()` on startup.

Default seed data is embedded in Knex migrations and loaded into `*_default` shadow tables on first run. Two tiers: **system data** (e.g. auto-managed tags: `expired`, `pushed`, `pulled`, `cross-processed`) is always copied to main tables on startup; **convenience data** (film formats, stocks, tags, stock-tags) is only copied when `DISABLE_DEFAULT_DATA_IMPORT` is not set.

In the combined production container, `ServeStaticModule` (registered conditionally based on whether `/app/public` exists) serves the Vue SPA for all non-`/api` routes. Security headers are applied by `helmet` in `main.ts`.

A `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true` is applied globally. Swagger docs auto-generated at `/api/docs`.

### Frontend (Vue 3 + Vite + Pinia + Tailwind)

All HTTP calls go through `src/services/api-client.ts` (Axios-based). Views never call fetch directly. `VITE_API_URL` defaults to `/api` (relative), which works in both production (same-origin) and development (Vite dev server proxies `/api` to the API container).

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

Before starting the stack, copy `.env.example` to `.env` and fill in values. `docker-compose.yml` does not supply defaults — startup will fail if these variables are not set.

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

### Architectural Decision-Making

When choosing between approaches, **always pursue the architecturally cleaner solution** unless there is a concrete, articulable reason not to. The simpler path is only acceptable when you can explain clearly why the cleaner approach would add complexity without proportional benefit.

Guidelines:
- Follow established patterns in the codebase (NestJS feature modules, centralized `DatabaseService`, centralized `api-client.ts`)
- Prefer explicit over implicit — don't hide behavior in middleware or base classes without a clear reason
- When a simpler path is genuinely better (e.g., a one-liner utility vs. a new class), state the reason: "A shared module here would add indirection without reuse benefit because X"
- If uncertain between clean and simple, describe both options and the trade-off before proceeding

### Context Preservation

If the session is compacted mid-task, a summary is automatically written to `/tmp/claude-frollz-state.md`. Read this file at the start of a resumed session to restore context.
