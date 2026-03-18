# Architecture Decision Record

## PURPOSE
Frollz is a film photography tracking application. It allows photographers to manage their film rolls through a lifecycle (loading, shooting, developing, etc.), catalog film stocks with tags, and track film formats. The system provides a UI for browsing/managing all entities and an API backend that persists data.

## STACK
- **Backend:** NestJS (TypeScript) — `frollz-api`
- **Frontend:** Vue 3 + TypeScript, Tailwind CSS, Vite — `frollz-ui`
- **Database:** PostgreSQL 18
- **Infrastructure:** Docker Compose; single combined production container (API + UI); separate containers for development
- **Build:** Multi-stage root `Dockerfile` (ui-build → api-build → production)

## ARCHITECTURE
Monorepo deployed as a single container in production. The combined image contains the NestJS API and the built Vue SPA; NestJS serves both. PostgreSQL runs as a separate container. No nginx is involved — users are expected to place a reverse proxy (Nginx Proxy Manager, Traefik, Caddy, etc.) in front for HTTPS termination.

- **frollz-api**: NestJS REST API. Each domain (`roll`, `roll-state`, `stock`, `stock-tag`, `tag`, `film-format`) is a self-contained NestJS feature module with `controller / service / module / dto / entities` structure. A shared `DatabaseService` wraps all PostgreSQL access via Knex — `query<T>(sql, params): Promise<T[]>` and `execute(sql, params): Promise<void>` are the public API used by all feature services. Schema is managed via Knex migrations in `frollz-api/migrations/`; seed data loaded from `db-init/default/` into `*_default` shadow tables, then copied to main tables.
- **frollz-ui**: Vue 3 SPA. Views are per-domain. A centralized `api-client.ts` service handles all HTTP communication with the API. Shared UI utilities include typeahead suggestion builders for brands and speeds.

## PATTERNS
- **NestJS feature modules**: Every resource gets its own folder with `module / controller / service / dto / entities`.
- **Migration-first DB**: Schema is managed via Knex migrations (`frollz-api/migrations/`). `DatabaseService.onModuleInit` calls `knex.migrate.latest()` on startup, applying any pending migrations automatically. Migration files are numbered by timestamp and are idempotent — each uses `hasTable`/`hasColumn` guards before making DDL changes.
- **Shadow table seed pattern**: Default seed data (film formats, stocks, tags, stock-tags) is loaded into `*_default` tables first, then `INSERT INTO main SELECT * FROM default ON CONFLICT DO NOTHING` copies to main tables. This preserves defaults even when users modify main data.
- **Seed data via JSON files**: Default data loaded by `DatabaseService.loadSeedData` on module init. Can be disabled via the `DISABLE_DEFAULT_DATA_IMPORT` environment variable (`true`/`1` to skip; defaults to `false`).
- **Row mappers per service**: Each feature service has a private `mapX(row)` function that translates snake_case postgres column names to camelCase TypeScript entity fields, and aliases `row.id` to `_key`.
- **Centralized API client**: UI uses a single `api-client.ts` service; views do not call HTTP directly.
- **Frontend metadata gate**: `RollDetailView` uses `STATES_REQUIRING_METADATA` (Set) and `STATES_WITH_DATE_CAPTURE` (Set) to conditionally show an inline form before executing a transition. States in `STATES_REQUIRING_METADATA` pause the transition and render state-specific fields; states in `STATES_WITH_DATE_CAPTURE` also render a date picker pre-populated with today's date.
- **State machine for rolls**: `roll-state` module manages roll lifecycle transitions via `RollService.transition`. Valid transitions are defined in `FORWARD_TRANSITIONS` and `BACKWARD_TRANSITIONS` maps. Each transition creates a `roll_states` history entry with optional `date`, `notes`, `isErrorCorrection`, and state-specific `metadata` (JSONB). Backward transitions can be flagged as error corrections.
- **State transition metadata**: Each state captures structured metadata fields — storage states (FROZEN/REFRIGERATED/SHELVED) capture `temperature`; LOADED captures the load date; FINISHED captures `shotISO`; SENT_FOR_DEVELOPMENT captures `labName`, `deliveryMethod`, `processRequested`, and `pushPullStops`; DEVELOPED captures the development date; RECEIVED captures `scansReceived`, `scansUrl`, `negativesReceived`, and `negativesDate`.
- **Auto-tagging**: `RollTagService.syncAutoTag` maintains auto-managed tags (`expired`, `pushed`, `pulled`, `cross-processed`). These are recomputed on relevant transitions — `expired` on create/update when expiration date precedes date obtained; `pushed`/`pulled` on FINISHED using `shotISO` vs stock speed; `cross-processed` on SENT_FOR_DEVELOPMENT when `processRequested` differs from the stock's native process.
- **Denormalized roll reads**: `findAll` and `findOne` in `RollService` JOIN `stocks` and `film_formats` tables to return `stockName`, `stockSpeed`, and `formatName` alongside the roll, avoiding extra round-trips in the UI.
- **Transition date handling (frontend)**: Date capture uses an HTML date input returning a bare `YYYY-MM-DD` string. To avoid UTC midnight parse issues, the UI combines the selected date with the current wall-clock time using local timezone components (`new Date(year, month-1, day, h, m, s).toISOString()`), then sends the ISO string to the API. History display shows date only (no time) via `formatDate`.
- **Typeahead utilities**: Brand and speed suggestion logic extracted into pure utility functions (`brandSuggestions.ts`, `speedSuggestions.ts`).

## TRADEOFFS
- **PostgreSQL over document DB**: Relational model fits the well-defined film stock metadata domain well. Familiar SQL and strong tooling outweigh the flexibility of a document DB for this use case. Knex used as a lightweight query builder and migration runner — enough structure to stay safe without the weight of a full ORM.
- **NestJS module boilerplate**: Strong conventions improve navigability at the cost of verbosity for simple resources.
- **Single combined container**: Simplifies self-hosted deployment to a single `docker-compose.yml` with two services. Trades some separation of concerns for a dramatically simpler user-facing deployment story. The dev workflow retains separate containers with HMR via `docker-compose.dev.yml`.
- **No nginx in the application**: Security headers previously set in nginx are now applied by `helmet` in `main.ts`. TLS termination is delegated to the user's reverse proxy (NPM, Traefik, Caddy, etc.) — this is the same model used by comparable self-hosted applications.
- **Monorepo without shared packages**: API and UI types are duplicated (e.g., `frollz-ui/src/types/index.ts` mirrors API entities) rather than shared via a workspace package.

## PHILOSOPHY
- Domain-driven module organization: code is grouped by business concept, not technical layer.
- Separation of concerns: API owns persistence and business logic; UI owns presentation only.
- Schema-first data integrity: database schemas enforced at the DB layer, not just application layer.
- Keep infrastructure simple: single combined container over multi-service orchestration for production.
