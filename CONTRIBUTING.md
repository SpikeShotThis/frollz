# Contributing to Frollz

Thanks for your interest in contributing. Whether you're fixing a bug, adding a feature, or improving the docs — all contributions are welcome.

## Table of contents

- [Getting started](#getting-started)
- [Development setup](#development-setup)
- [Making changes](#making-changes)
- [Submitting a pull request](#submitting-a-pull-request)
- [Coding conventions](#coding-conventions)
- [Filing issues](#filing-issues)

---

## Getting started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
   ```bash
   git clone https://github.com/<your-username>/frollz.git
   cd frollz
   ```
3. **Activate the pre-commit hook** (required — mirrors CI exactly)
   ```bash
   git config core.hooksPath .githooks
   ```
4. **Copy the environment file**
   ```bash
   cp .env.example .env
   ```
   The defaults in `.env.example` work for local development.

---

## Development setup

Frollz uses Docker Compose for development. You'll need Docker with the Compose plugin installed.

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts three services:
- `frollz-api` — NestJS API on port 3000 (watch mode, auto-reloads on file save)
- `frollz-ui` — Vite dev server on port 5173 (HMR)
- `postgres` — PostgreSQL 18 on port 5432

The UI dev server proxies `/api` requests to the API container automatically — no extra config needed.

After making code changes, the watch mode containers reload automatically. If you add or change dependencies, rebuild the affected container:

```bash
docker compose -f docker-compose.dev.yml build frollz-api   # or frollz-ui
docker compose -f docker-compose.dev.yml up -d frollz-api
```

### Running tests and lint locally

**API** (from `frollz-api/`):
```bash
npm test          # Jest unit tests
npm run lint      # ESLint with auto-fix
```

**UI** (from `frollz-ui/`):
```bash
npm test          # Vitest unit tests
npm run lint      # ESLint with auto-fix
npm run type-check
```

The pre-commit hook runs all of the above plus a Semgrep SAST scan automatically before every commit. If the hook passes, CI will pass.

---

## Making changes

### Branch from `development`

All work branches from `development`, not `main`. `main` tracks the latest release.

```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature-name   # or fix/your-fix-name
```

### One concern per PR

Keep pull requests focused. A PR that fixes a bug and adds a feature is harder to review and harder to revert if something goes wrong. Split unrelated changes into separate PRs.

### Tests

All new code should have unit tests. If you're fixing a bug, add a test that would have caught it. If you're adding a feature, cover the happy path and the key failure cases.

Test files live alongside the code they test:
- API: `frollz-api/src/<module>/<module>.service.spec.ts`
- UI: `frollz-ui/src/views/__tests__/<ViewName>.spec.ts`

### Database changes

Schema changes go in a new Knex migration file in `frollz-api/migrations/`. Migrations run automatically on startup — never modify an existing migration that has already been merged.

Migration filename format: `YYYYMMDDHHmmss_description.ts`

---

## Submitting a pull request

1. Push your branch and open a PR against the `development` branch (not `main`)
2. Fill out the PR template — describe what changed and how you tested it
3. All CI checks must pass before a PR can be merged
4. A maintainer will review your PR; please respond to feedback promptly
5. Once approved, a maintainer will merge it

**Please wait for review before merging.** We don't auto-merge PRs.

---

## Coding conventions

The codebase follows a consistent set of patterns — please match the style of the surrounding code.

### Backend (NestJS)

- Each domain resource is a self-contained module: `module / controller / service / dto / entities`
- All database access goes through `DatabaseService` — never import a database client directly
- DTOs use `class-validator` decorators for validation
- Services return typed entity objects; controllers return those directly (NestJS serializes them)
- Row mappers (`mapX(row)`) translate snake_case DB columns to camelCase TypeScript fields

### Frontend (Vue 3)

- All HTTP calls go through `src/services/api-client.ts` — views never call fetch/axios directly
- Views are per-domain and live in `src/views/`
- Shared UI components go in `src/components/`
- Use the Composition API (`<script setup>`) — not the Options API

### General

- TypeScript strict mode is on — no `any` unless genuinely unavoidable
- Prefer explicit over clever — readable code over terse code
- No console.log in committed code

---

## Filing issues

Use the GitHub issue templates:
- **Bug report** — for something that isn't working as expected
- **Feature request** — for something you'd like Frollz to do

Before opening an issue, search existing issues to avoid duplicates. For security vulnerabilities, please read [SECURITY.md](SECURITY.md) before posting publicly.
