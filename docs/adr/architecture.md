# Architecture Decision Record

## PURPOSE
Frollz is a self-hosted film photography tracker. It allows photographers to catalogue film emulsions, manage individual film rolls through a defined lifecycle (adding, storing, loading, shooting, developing, receiving), and track cameras. The system provides a Vue 3 SPA for browsing and managing all entities and a NestJS REST API that owns all persistence and business logic.

## STACK
- **Backend:** NestJS (TypeScript) — `frollz-api`
- **Frontend:** Vue 3 + TypeScript, Tailwind CSS, Vite — `frollz-ui`
- **Database:** PostgreSQL 18 in production; SQLite (`better-sqlite3`) in development and test (selected automatically when `NODE_ENV=development`)
- **Infrastructure:** Docker Compose; single combined production container (API + UI); separate containers for development
- **Build:** Multi-stage root `Dockerfile` (ui-build → api-build → production)

## ARCHITECTURE
Monorepo deployed as a single container in production. The combined image contains the NestJS API and the built Vue SPA; NestJS serves both via `ServeStaticModule` for all non-`/api` routes. PostgreSQL runs as a separate container. No nginx is involved — users are expected to place a reverse proxy (Nginx Proxy Manager, Traefik, Caddy, etc.) in front for HTTPS termination. Security headers are applied by `helmet` in `main.ts`.

**Production** (`docker-compose.yml`): two services — `frollz` (combined container) + `postgres`.

**Development** (`docker-compose.dev.yml`): three services — `frollz-api` (NestJS watch mode), `frollz-ui` (Vite dev server with HMR, port 5173), `postgres`. The Vite dev server proxies `/api` requests to the API container via `server.proxy` in `vite.config.ts`.

## DOMAIN MODEL

### Core entities
| Entity | Description |
|---|---|
| `Emulsion` | A film emulsion (e.g. Kodak Portra 400 in 35mm). Belongs to a `Format`. Carries brand, manufacturer, ISO speed, process, and an optional box image. |
| `Film` | A single physical roll owned by the user. References an `Emulsion` and a `TransitionProfile`. Tracks its lifecycle through `FilmState` history. |
| `FilmState` | One entry in a film's state history. Records the `TransitionState` entered, date, and optional structured metadata. |
| `Camera` | A camera body owned by the user. Has a status (`active`, `retired`, `in_repair`) and a list of accepted `Format`s. Currently a standalone catalogue — association to films is a future story. |
| `Format` | A film format (e.g. 35mm, 120, 4×5). Referenced by emulsions and cameras. |
| `Tag` | A user-defined label. Single shared pool — applied to both films and emulsions via join records. |

### Reference / configuration entities
| Entity | Description |
|---|---|
| `TransitionState` | A valid lifecycle state (Added, Frozen, Loaded, …). Seeded at startup. |
| `TransitionProfile` | A named state machine variant (`standard`, `instant`, `bulk`). Governs which transitions are allowed for a film. |
| `TransitionRule` | One allowed edge in the state machine: `fromState → toState` scoped to a `profile`. Seeded at startup. |
| `TransitionMetadataField` | A named field captured when entering a specific state (e.g. `shotISO` at Finished). |
| `TransitionStateMetadata` | Links a `TransitionMetadataField` to the `TransitionState` it belongs to. |

## LAYERED MODULE STRUCTURE

Each domain is a self-contained NestJS feature module organised in four layers:

```
src/
  domain/<domain>/
    entities/          ← plain TypeScript classes, no framework deps
    repositories/      ← repository interfaces (IXxxRepository)
  infrastructure/
    persistence/<domain>/
      xxx.knex.repository.ts   ← Knex implementation of the interface
      xxx.mapper.ts            ← row → domain entity conversion
  modules/<domain>/
    application/
      xxx.service.ts   ← business logic, injected repositories
    dto/               ← class-validator DTOs
    xxx.controller.ts
    xxx.module.ts      ← wires providers/exports
```

`DatabaseModule` provides the Knex connection (`KNEX_CONNECTION` injection token) and `MigrationRunnerService`, which calls `knex.migrate.latest()` then `knex.seed.run()` on `onModuleInit`. Seeds are idempotent (`ON CONFLICT DO NOTHING`).

## PATTERNS

### State machine (film lifecycle)
`FilmService.transition()` validates the requested `targetStateName` against the DB-driven `transition_rule` table scoped to the film's `transitionProfileId`, then inserts a new `film_state` row. Three built-in profiles:

| Profile | Intended use | Key difference |
|---|---|---|
| `standard` | C-41 / E-6 / B&W lab workflow | Finished → Sent For Development → Developed → Received |
| `instant` | Instax / Polaroid | Finished → Received directly; no lab steps |
| `bulk` | Bulk canister stock | Storage and loading only; no post-shoot chain |

Backward transitions (error corrections) are permitted by explicit reverse rules seeded for each profile.

### Transition metadata
Structured fields captured at specific states are declared in `transition_metadata_field` and linked to their target states in `transition_state_metadata`. Values are stored per `film_state` row in `film_state_metadata`. Fields with `allow_multiple = true` (e.g. `scansUrl`) store one row per value. Fields are keyed by name in API payloads.

**Acquisition metadata** (`dateObtained`, `obtainmentMethod`, `obtainedFrom`) is captured as metadata on the initial **Added** state, passed in the `metadata` field of `POST /films`.

**State-specific fields:**

| State | Metadata fields |
|---|---|
| Added | `dateObtained` (date), `obtainmentMethod` (string), `obtainedFrom` (string) |
| Frozen / Refrigerated | `temperature` (number) |
| Finished | `shotISO` (number) |
| Sent For Development | `labName`, `deliveryMethod`, `processRequested` (string), `pushPullStops` (number) |
| Received | `scansReceived` (boolean), `scansUrl` (string, allow_multiple), `negativesReceived` (boolean), `negativesDate` (date) |

### Repository pattern
Every persistence operation goes through a typed interface (`IXxxRepository`) defined in the domain layer. The Knex implementation lives in infrastructure. Services inject via NestJS token and never touch Knex directly. Mapper classes handle all row-to-domain translation.

### Tags (shared pool)
All tags live in a single `tags` table. Association to films and emulsions is managed via join operations through the respective service (`addTag` / `removeTag`). There are no separate tag namespaces per entity type.

### Centralized API client (frontend)
The Vue SPA uses a single `api-client.ts`; views never call HTTP directly.

### Frontend metadata gate
`FilmDetailView` uses `STATES_REQUIRING_METADATA` (Set) and `STATES_WITH_DATE_CAPTURE` (Set) to conditionally show an inline form before executing a transition. States in `STATES_REQUIRING_METADATA` pause the transition and render state-specific fields; states in `STATES_WITH_DATE_CAPTURE` also render a date picker pre-populated with today's date.

### Transition date handling (frontend)
Date inputs return a bare `YYYY-MM-DD` string. To avoid UTC midnight parse issues the UI combines the date with the current wall-clock time using local timezone components (`new Date(year, month-1, day, h, m, s).toISOString()`), then sends the ISO string to the API.

## TRADEOFFS
- **PostgreSQL over document DB**: Relational model fits the well-defined film metadata domain. Knex used as a lightweight query builder and migration runner — enough structure without full-ORM weight.
- **NestJS module boilerplate**: Strong conventions improve navigability at the cost of verbosity for simple resources.
- **Single combined container**: Simplifies self-hosted deployment to a two-service `docker-compose.yml`. Trades separation of concerns for dramatically simpler user-facing ops. Dev workflow retains separate containers with HMR.
- **No nginx in the application**: TLS termination delegated to the user's reverse proxy. Same model used by comparable self-hosted applications.
- **Monorepo without shared packages**: API and UI types are intentionally duplicated rather than shared via a workspace package, avoiding build-tooling complexity for a two-package repo.
- **SQLite in development**: Eliminates the need to run Postgres locally. SQLite FK constraints are not enforced without `PRAGMA foreign_keys = ON`; migrations guard this with `isSQLite()` checks where DDL differs.

## PHILOSOPHY
- Domain-driven module organisation: code is grouped by business concept, not technical layer.
- Separation of concerns: API owns persistence and business logic; UI owns presentation only.
- Schema-first data integrity: constraints enforced at the DB layer, not only the application layer.
- Keep infrastructure simple: single combined container over multi-service orchestration for production.

## KNOWN GAPS (open issues)
- **Auto-tagging** (`expired`, `pushed`, `pulled`, `cross-processed`) was present in the previous architecture and was lost during the domain rename. Tracked as a future issue to restore.
- **Camera ↔ Film association**: Camera is currently a standalone catalogue entity. A future story will add a join table to associate a film with the camera it is loaded into.
