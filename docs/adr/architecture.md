# Architecture Decision Record

## PURPOSE
Frollz is a film photography tracking application. It allows photographers to manage their film rolls through a lifecycle (loading, shooting, developing, etc.), catalog film stocks with tags, and track film formats. The system provides a UI for browsing/managing all entities and an API backend that persists data.

## STACK
- **Backend:** NestJS (TypeScript) — `frollz-api`
- **Frontend:** Vue 3 + TypeScript, Tailwind CSS, Vite — `frollz-ui`
- **Database:** ArangoDB (document/graph database)
- **Infrastructure:** Docker Compose, Nginx reverse proxy (root `nginx/` + per-service configs)
- **Build:** Multi-stage Docker builds per service

## ARCHITECTURE
Monorepo with two independently containerized services orchestrated via `docker-compose.yml`:

- **frollz-api**: NestJS REST API. Each domain (`roll`, `roll-state`, `stock`, `stock-tag`, `tag`, `film-format`) is a self-contained NestJS feature module with `controller / service / module / dto / entities` structure. A shared `DatabaseService` wraps all ArangoDB access (`query` fan-in: 21, `getCollection` fan-in: 17 — the central data access hotspot). DB schemas are defined as JSON Schema files in `db-init/schemas/`, seed data in `db-init/default/`.
- **frollz-ui**: Vue 3 SPA. Views are per-domain. A centralized `api-client.ts` service handles all HTTP communication with the API. Shared UI utilities include typeahead suggestion builders for brands and speeds.
- **Nginx** acts as the reverse proxy routing traffic between services.

## PATTERNS
- **NestJS feature modules**: Every resource gets its own folder with `module / controller / service / dto / entities`.
- **Schema-first DB**: ArangoDB collections are validated against JSON Schemas loaded at startup via `DatabaseService.loadSchema`.
- **Seed data via JSON files**: Default data (film formats, stocks, tags) loaded by `DatabaseService.loadSeedData` on module init. Can be disabled via the `DISABLE_DEFAULT_DATA_IMPORT` environment variable (`true`/`1` to skip; defaults to `false`).
- **Centralized API client**: UI uses a single `api-client.ts` service; views do not call HTTP directly.
- **State machine for rolls**: `roll-state` module manages roll lifecycle transitions (`RollService.update` / `transition`).
- **Typeahead utilities**: Brand and speed suggestion logic extracted into pure utility functions (`brandSuggestions.ts`, `speedSuggestions.ts`).

## TRADEOFFS
- **ArangoDB over relational DB**: Flexible document model suits varied film stock metadata, but ArangoDB is less familiar than PostgreSQL — requires knowledge of AQL.
- **NestJS module boilerplate**: Strong conventions improve navigability at the cost of verbosity for simple resources.
- **Docker Compose for orchestration**: Simple for local development; would need migration to Kubernetes or similar for production scaling.
- **Monorepo without shared packages**: API and UI types are duplicated (e.g., `frollz-ui/src/types/index.ts` mirrors API entities) rather than shared via a workspace package.

## PHILOSOPHY
- Domain-driven module organization: code is grouped by business concept, not technical layer.
- Separation of concerns: API owns persistence and business logic; UI owns presentation only.
- Schema-first data integrity: database schemas enforced at the DB layer, not just application layer.
- Keep infrastructure simple: Docker Compose + Nginx over more complex orchestration.
