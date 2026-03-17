# Architecture Decision Record

## PURPOSE
Frollz is a film photography tracking application. It allows photographers to manage their film rolls through a lifecycle (loading, shooting, developing, etc.), catalog film stocks with tags, and track film formats. The system provides a UI for browsing/managing all entities and an API backend that persists data.

## STACK
- **Backend:** NestJS (TypeScript) — `frollz-api`
- **Frontend:** Vue 3 + TypeScript, Tailwind CSS, Vite — `frollz-ui`
- **Database:** PostgreSQL 18
- **Infrastructure:** Docker Compose, Nginx reverse proxy (root `nginx/` + per-service configs)
- **Build:** Multi-stage Docker builds per service

## ARCHITECTURE
Monorepo with two independently containerized services orchestrated via `docker-compose.yml`:

- **frollz-api**: NestJS REST API. Each domain (`roll`, `roll-state`, `stock`, `stock-tag`, `tag`, `film-format`) is a self-contained NestJS feature module with `controller / service / module / dto / entities` structure. A shared `DatabaseService` wraps all PostgreSQL access via a `pg` Pool — `query<T>(sql, params): Promise<T[]>` and `execute(sql, params): Promise<void>` are the public API used by all feature services. Tables are created via DDL on module init; seed data loaded from `db-init/default/` into `*_default` shadow tables, then copied to main tables.
- **frollz-ui**: Vue 3 SPA. Views are per-domain. A centralized `api-client.ts` service handles all HTTP communication with the API. Shared UI utilities include typeahead suggestion builders for brands and speeds.
- **Nginx** acts as the reverse proxy routing traffic between services.

## PATTERNS
- **NestJS feature modules**: Every resource gets its own folder with `module / controller / service / dto / entities`.
- **DDL-first DB**: PostgreSQL tables are created via `CREATE TABLE IF NOT EXISTS` DDL run at startup by `DatabaseService.initializeTables`. No migration framework — schema lives in the DDL constant in `database.service.ts`.
- **Shadow table seed pattern**: Default seed data (film formats, stocks, tags, stock-tags) is loaded into `*_default` tables first, then `INSERT INTO main SELECT * FROM default ON CONFLICT DO NOTHING` copies to main tables. This preserves defaults even when users modify main data.
- **Seed data via JSON files**: Default data loaded by `DatabaseService.loadSeedData` on module init. Can be disabled via the `DISABLE_DEFAULT_DATA_IMPORT` environment variable (`true`/`1` to skip; defaults to `false`).
- **Row mappers per service**: Each feature service has a private `mapX(row)` function that translates snake_case postgres column names to camelCase TypeScript entity fields, and aliases `row.id` to `_key`.
- **Centralized API client**: UI uses a single `api-client.ts` service; views do not call HTTP directly.
- **State machine for rolls**: `roll-state` module manages roll lifecycle transitions (`RollService.update` / `transition`).
- **Typeahead utilities**: Brand and speed suggestion logic extracted into pure utility functions (`brandSuggestions.ts`, `speedSuggestions.ts`).

## TRADEOFFS
- **PostgreSQL over document DB**: Relational model fits the well-defined film stock metadata domain well. Familiar SQL and strong tooling outweigh the flexibility of a document DB for this use case. Raw `pg` used over an ORM to keep the migration minimal and explicit.
- **NestJS module boilerplate**: Strong conventions improve navigability at the cost of verbosity for simple resources.
- **Docker Compose for orchestration**: Simple for local development; would need migration to Kubernetes or similar for production scaling.
- **Monorepo without shared packages**: API and UI types are duplicated (e.g., `frollz-ui/src/types/index.ts` mirrors API entities) rather than shared via a workspace package.

## PHILOSOPHY
- Domain-driven module organization: code is grouped by business concept, not technical layer.
- Separation of concerns: API owns persistence and business logic; UI owns presentation only.
- Schema-first data integrity: database schemas enforced at the DB layer, not just application layer.
- Keep infrastructure simple: Docker Compose + Nginx over more complex orchestration.
