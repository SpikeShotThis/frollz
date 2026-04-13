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
git checkout develop && git fetch origin && git pull origin develop
git checkout -b feature/{issue-number}-{issue-title-slug}
```

Use the `/feature-dev` skill to run the full workflow.

## Rules

1. **Never work directly on `main`.**
2. **Wait for user approval before submitting or merging a PR** — do not auto-merge.
3. Target branch for feature PRs is always `develop`. Release PRs target `main`.
4. `docs/adr/architecture.md` must be updated for any architectural change.
5. Use `/clear` between unrelated tasks to keep context clean.
6. Use subagents for codebase investigation — keeps file reads out of main context.

## Skills

| Skill | When to use |
|---|---|
| `/feature-dev` | Picking up a GitHub issue — branch + explore + plan + implement |
| `/code-review` | Pre-PR checklist — blast radius, tests, lint, ADR |
| `/commit` | Scoped commit with message generation |
| `/commit-push-pr` | Commit + push + open draft PR |
| `/add-api-module` | Add a complete new NestJS domain feature (all 4 layers) |
| `/debug` | Structured bug investigation — reproduce → isolate → fix → verify |
| `/codebase-memory` | Structural queries, tracing, quality audits |
| `/simplify` | Cleanup pass on changed code |
| `/claude-md-improver` | Audit and update this file |
