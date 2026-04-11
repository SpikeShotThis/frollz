# API Rewrite — State & Remediation Plan

This document captures the current state of the `chore/235-refactor-film-format` branch refactor, what is missing, what has broken compatibility with the UI, and what needs to be done to get everything working again.

---

## What the Refactor Is

The old `frollz-api` was a flat NestJS monolith where each domain module contained a controller, service, DTOs, and entities all in one directory. The new architecture follows **Domain-Driven Design (DDD)** with a strict layering:

```
src/
  domain/          ← Pure domain entities + repository interfaces (no framework dependencies)
  infrastructure/  ← Knex implementations of repository interfaces
  modules/         ← NestJS DI wiring (binds interfaces to implementations)
  app.module.ts
  main.ts
```

### What IS Complete

The **domain** and **persistence** layers are fully implemented:

- All domain entities: `Film`, `Emulsion`, `FilmState`, `FilmStateMetadata`, `Format`, `Package`, `Process`, `Tag`, `TransitionState`, `TransitionRule`, `TransitionProfile`, `TransitionStateMetadata`, `TransitionMetadataField`
- All repository interfaces (in `domain/*/repositories/`)
- All Knex repository implementations (in `infrastructure/persistence/`)
- All NestJS modules wiring DI: `FilmModule`, `EmulsionModule`, `FilmStateModule`, `SharedModule`, `TransitionModule`, `DatabaseModule`

---

## What Is Entirely Missing

### No HTTP surface at all

**Zero controllers exist.** Every module registers repository bindings only. The app starts and connects to Postgres but serves no endpoints — every UI call returns 404.

### No application services

There is no layer orchestrating repositories into business operations (e.g. "create a film and assign default tags", "transition a film state and record metadata").

### Missing `main.ts` infrastructure

The new `main.ts` is bare — the following were stripped and not replaced:

| Feature | Old location | Status |
|---|---|---|
| `ValidationPipe` (transform, whitelist, forbidNonWhitelisted) | `main.ts` | **Missing** |
| `HttpExceptionFilter` | `src/common/filters/` | **Deleted, not replaced** |
| Swagger / API docs at `/api/docs` | `main.ts` | **Missing** |
| Helmet security headers | `main.ts` | **Missing** |
| Rate limiting / throttle | `src/common/throttle-limits.ts` | **Deleted, not replaced** |
| `ServeStaticModule` (SPA serving in production) | `app.module.ts` | **Missing** |

---

## Breaking Domain Model Changes

### 1. `film-format` → `format` + `package` (split model)

The old `FilmFormat` was a single entity combining format size and package type. It has been split into two entities.

| Old `FilmFormat` | New `Format` | New `Package` |
|---|---|---|
| `_key` | `id` | `id` |
| `formFactor` (`'Roll'`, `'Sheet'`, `'Instant'`, …) | `packageId` (FK → `Package`) | `name` (e.g. `'Roll'`) |
| `format` (`'35mm'`, `'120'`, …) | `name` (e.g. `'35mm'`) | — |

**UI impact**: `filmFormatApi` and the `FilmFormat` type need to be redesigned around the split model. The `/film-formats` route no longer makes sense as-is.

---

### 2. `stock` → `emulsion` (renamed)

| Old `Stock` field | New `Emulsion` field |
|---|---|
| `_key` | `id` |
| `formatKey` | `formatId` |
| `process` (inline enum: `'C-41'`, `'E-6'`, …) | `processId` (FK → `process` table) |
| `baseStockKey` | `parentId` |
| `brand`, `manufacturer`, `speed`, `boxImageUrl` | same (all present) |

`process` is now a reference table, not an inline string enum. The typeahead endpoints (`/stocks/brands`, `/stocks/manufacturers`, `/stocks/speeds`) have no corresponding repository methods yet.

**UI impact**: `stockApi` → rename to `emulsionApi`. Update field names. Rework or add typeahead repository methods.

---

### 3. `roll` → `film` (renamed, significantly slimmer model)

| Old `Roll` field | New `Film` field |
|---|---|
| `_key` / `rollId` | `id` |
| `stockKey` | `emulsionId` |
| `state` (current state as string) | `currentState` (computed getter from `states: FilmState[]`) |
| `dateObtained` | **Not present in entity** |
| `obtainmentMethod` | **Not present in entity** |
| `obtainedFrom` | **Not present in entity** |
| `timesExposedToXrays` | **Not present in entity** |
| `loadedInto` | **Not present in entity** |
| `imagesUrl` | **Not present in entity** |
| `transitionProfile` | **Not present in entity** |
| `parentRollId` | `parentId` |
| `childRollCount` | **Not present in entity** |

Many fields the UI currently reads from `Roll` have no equivalent in the new `Film` entity. A decision is needed on whether these fields are moved to `FilmState` metadata, stored elsewhere, or added back to `Film`.

**UI impact**: `rollApi` → rename to `filmApi`. Many displayed fields will be missing until the entity is fleshed out.

---

### 4. `roll-state` → `film-state` (renamed)

| Old `RollStateHistory` field | New `FilmState` field |
|---|---|
| `rollId` | `filmId` |
| `state` (RollState enum string) | `stateId` (FK, resolved via `state?: TransitionState`) |
| `notes` | `note` |
| `isErrorCorrection` | **Gone** |
| `metadata` (generic Record) | `metadata: FilmStateMetadata[]` (typed) |

**UI impact**: `rollStateApi` → rename to `filmStateApi`. The `isErrorCorrection` concept needs a decision.

---

### 5. Tags (field renames)

| Old `Tag` field | New `Tag` field |
|---|---|
| `value` | `name` |
| `color` | `colorCode` |
| `isRollScoped` | **Gone from entity** |
| `isStockScoped` | **Gone from entity** |
| — | `description` (new field) |

**UI impact**: Update `tagApi` and `Tag` type. Scope fields (`isRollScoped`, `isStockScoped`) need a decision — were they meaningful and need to come back, or intentionally removed?

---

### 6. Junction table renames

| Old table | New table |
|---|---|
| `stock_tag` | `emulsion_tag` |
| `roll_tag` | `film_tag` |

**UI impact**: `stockTagApi` → `emulsionTagApi`, `rollTagApi` → `filmTagApi`. Route paths will change.

---

### 7. Environment variables renamed

| Old variable | New variable |
|---|---|
| `POSTGRES_HOST` | `DATABASE_HOST` |
| `POSTGRES_PORT` | `DATABASE_PORT` |
| `POSTGRES_DATABASE` | `DATABASE_NAME` |
| `POSTGRES_USER` | `DATABASE_USER` |
| `POSTGRES_PASSWORD` | `DATABASE_PASSWORD` |

`.env.example`, `docker-compose.yml`, and `docker-compose.dev.yml` need to be updated.

---

## Remediation Plan

### Phase 1 — Restore HTTP layer

For each domain, add a **controller** and **application service** that orchestrates the repository layer. The service layer sits between the controller and repositories and is where business rules live (e.g. transition validation, bulk roll logic).

Domains needing controllers + services:

- [ ] `Format` (replaces `FilmFormat`) — GET/POST/PATCH/DELETE
- [ ] `Package` — GET (reference data, likely read-only)
- [ ] `Process` — GET (reference data, likely read-only)
- [ ] `Emulsion` (replaces `Stock`) — GET/POST/PATCH/DELETE + typeahead endpoints
- [ ] `Tag` — GET/POST/PATCH/DELETE
- [ ] `EmulsionTag` (replaces `StockTag`) — GET/POST/DELETE
- [ ] `Film` (replaces `Roll`) — GET/POST/PATCH/DELETE + children + filter by state
- [ ] `FilmTag` (replaces `RollTag`) — GET/POST/DELETE
- [ ] `FilmState` (replaces `RollState`) — GET by filmId, POST (transition)
- [ ] `Transition` — GET graph by profile

### Phase 2 — Restore middleware in `main.ts`

- [ ] `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`
- [ ] Global `HttpExceptionFilter`
- [ ] Helmet security headers
- [ ] Swagger at `/api/docs`
- [ ] Rate limiting / throttle guards

### Phase 3 — Resolve open design questions

These fields/concepts were in the old model but have no place in the new domain yet. Each needs an explicit decision before the UI can be updated:

- **`dateObtained`, `obtainmentMethod`, `obtainedFrom`** on Roll — do these move to `Film`, to `FilmState` metadata, or a new `FilmAcquisition` entity?
- **`timesExposedToXrays`, `loadedInto`, `imagesUrl`** — same question
- **`transitionProfile`** — was on Roll; likely needs to be on `Film` or derived from `Emulsion.process`
- **`childRollCount`** — computed or persisted?
- **`isErrorCorrection`** on RollStateHistory — intentionally removed?
- **`isRollScoped`, `isStockScoped`** on Tag — intentionally removed?
- **Typeahead endpoints** (`/emulsions/brands`, `/emulsions/manufacturers`, `/emulsions/speeds`) — repository interfaces don't include these yet

### Phase 4 — Update the UI

Once routes and models are settled, update `frollz-ui`:

- [ ] Rename `filmFormatApi` → rework for `format` + `package` split
- [ ] Rename `stockApi` → `emulsionApi`, update all field references
- [ ] Rename `rollApi` → `filmApi`, update all field references
- [ ] Rename `stockTagApi` → `emulsionTagApi`
- [ ] Rename `rollTagApi` → `filmTagApi`
- [ ] Rename `rollStateApi` → `filmStateApi`
- [ ] Update `Tag` type: `value`→`name`, `color`→`colorCode`
- [ ] Update `types/index.ts` to reflect new domain model shapes
- [ ] Update all views that read `Roll`, `Stock`, `FilmFormat`, `Tag` fields

### Phase 5 — Environment + Docker

- [ ] Update `.env.example` with new variable names
- [ ] Update `docker-compose.yml` and `docker-compose.dev.yml` to use new env var names
- [ ] Verify new DB table names match what the Knex repositories query (`film`, `emulsion`, `film_tag`, `emulsion_tag`, `format`, `package`, `process`)
- [ ] Audit migrations to ensure schema matches new table names

---

## Quick Reference: Old → New Route Mapping

| UI currently calls | Should become | Status |
|---|---|---|
| `GET /film-formats` | `GET /formats` (+ packages) | Missing |
| `POST /film-formats` | `POST /formats` | Missing |
| `PATCH /film-formats/:key` | `PATCH /formats/:id` | Missing |
| `DELETE /film-formats/:key` | `DELETE /formats/:id` | Missing |
| `GET /stocks` | `GET /emulsions` | Missing |
| `POST /stocks` | `POST /emulsions` | Missing |
| `POST /stocks/bulk` | `POST /emulsions/bulk` | Missing |
| `PATCH /stocks/:key` | `PATCH /emulsions/:id` | Missing |
| `DELETE /stocks/:key` | `DELETE /emulsions/:id` | Missing |
| `GET /stocks/brands` | `GET /emulsions/brands` | Missing + no repo method |
| `GET /stocks/manufacturers` | `GET /emulsions/manufacturers` | Missing + no repo method |
| `GET /stocks/speeds` | `GET /emulsions/speeds` | Missing + no repo method |
| `GET /tags` | `GET /tags` | Missing |
| `POST /tags` | `POST /tags` | Missing |
| `PATCH /tags/:key` | `PATCH /tags/:id` | Missing |
| `DELETE /tags/:key` | `DELETE /tags/:id` | Missing |
| `GET /stock-tags` | `GET /emulsion-tags` | Missing |
| `POST /stock-tags` | `POST /emulsion-tags` | Missing |
| `DELETE /stock-tags/:key` | `DELETE /emulsion-tags/:id` | Missing |
| `GET /roll-tags` | `GET /film-tags` | Missing |
| `POST /roll-tags` | `POST /film-tags` | Missing |
| `DELETE /roll-tags/:key` | `DELETE /film-tags/:id` | Missing |
| `GET /rolls` | `GET /films` | Missing |
| `POST /rolls` | `POST /films` | Missing |
| `GET /rolls/:key` | `GET /films/:id` | Missing |
| `GET /rolls/:key/children` | `GET /films/:id/children` | Missing |
| `PATCH /rolls/:key` | `PATCH /films/:id` | Missing |
| `DELETE /rolls/:key` | `DELETE /films/:id` | Missing |
| `POST /rolls/:key/transition` | `POST /films/:id/transition` | Missing |
| `GET /transitions` | `GET /transitions` | Missing |
| `GET /roll-states` | `GET /film-states` | Missing |
