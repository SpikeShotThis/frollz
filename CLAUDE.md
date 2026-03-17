# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frollz is a full-stack film photography tracking application — a monorepo with two independently containerized services:
- **frollz-api**: NestJS REST API (port 3000) backed by ArangoDB
- **frollz-ui**: Vue 3 SPA (port 5173) served through Nginx

All traffic goes through Nginx on port 80, which proxies `/api/` to the API and `/` to the UI.

## Commands

### Docker (primary development workflow)

```bash
docker-compose up -d          # Start all services (Nginx, ArangoDB, API, UI)
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

The `codebase-memory-mcp` server is installed and should be used for structural code exploration. It indexes the codebase into a knowledge graph, making it far more token-efficient than file scanning.

**Prefer graph queries over Grep/Bash for structural questions.**

Key tools:
- `get_architecture` — start here for codebase orientation (entry points, hotspots, clusters)
- `search_graph` — find functions, classes, or symbols by name pattern
- `trace_call_path` — find callers/callees of a function (direction: `inbound` or `outbound`)
- `detect_changes` — map git diffs to affected symbols and blast radius
- `get_code_snippet` — retrieve source with metadata (signature, complexity, callers/callees)
- `query_graph` — Cypher-like queries for complex relationship analysis
- `search_code` — regex text search across files (replaces grep)

If the graph hasn't been indexed yet, run `index_repository` first.

## Architecture

### Backend (NestJS + ArangoDB)

Each domain (film-format, stock, roll, tag, roll-state, stock-tag) is a self-contained NestJS feature module with the structure: `controller / service / module / dto / entities`.

`DatabaseService` is the single point of ArangoDB access — all modules depend on it. It wraps `arangojs`, exposes a `query()` method and `getCollection()` method used by all feature services.

JSON Schemas in `frollz-api/db-init/schemas/` are applied at collection creation for DB-level validation. Seed data in `db-init/default/` (numbered 0001–0004) is loaded in order with foreign-key validation before insertion.

A `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true` is applied globally. Swagger docs auto-generated at `/api/docs`.

### Frontend (Vue 3 + Vite + Pinia + Tailwind)

All HTTP calls go through `src/services/api-client.ts` (Axios-based). Views never call fetch directly.

Five routes map to domain views: `/` (dashboard), `/stocks`, `/rolls`, `/formats`, `/tags`. Shared components in `src/components/` include `TypeaheadInput.vue`, `SpeedTypeaheadInput.vue`, and `NavBar.vue`.

### Environment Variables

| Variable | Service | Default |
|----------|---------|---------|
| `ARANGODB_URL` | API | `http://arangodb:8529` |
| `ARANGODB_DATABASE` | API | — |
| `ARANGODB_USERNAME` | API | — |
| `ARANGODB_PASSWORD` | API | — |
| `PORT` | API | `3000` |
| `VITE_API_URL` | UI | `/api` (Docker) or `http://localhost:3000` (local) |

ArangoDB web UI available at `http://localhost:8529` (root/rootpassword in dev).

## Workflow

### GitHub Issues

1. Base all branches off `development` (not `main`). Pull latest before branching.
2. Branch naming: `feature/<name>` for enhancements, `fix/<name>` for bugs.
3. After changes: build components and restart containers. If successful, commit and push all changed files.
4. **Wait for approval before submitting a PR** — do not auto-merge or auto-create PRs.
5. Prefer `gh` CLI for git operations.

### Review Checklist (after every code change)

- All modified code has unit tests and all tests pass
- All code passes linting rules (`npm run lint`)
- Code has been simplified with readability in mind
- `docs/adr/architecture.md` is updated to reflect any architectural changes, so context can be quickly rebuilt in future sessions
