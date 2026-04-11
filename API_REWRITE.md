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

### Phase 2 — Restore middleware in `main.ts` ✅

- [x] `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`
- [x] Global `HttpExceptionFilter`
- [x] Helmet security headers
- [x] Swagger at `/api/docs` (with `@ApiTags`, `@ApiOperation`, `@ApiProperty` on all controllers and DTOs)
- [x] Rate limiting — `ThrottlerModule` global guard, 200 req / 60s

### Phase 3 — Resolve open design questions ✅

Decisions made and implemented:

- **`dateObtained`, `obtainmentMethod`, `obtainedFrom`** → will become metadata on the "Added" `FilmState` (Phase 5 migration concern; no code changes yet)
- **`timesExposedToXrays`, `loadedInto`, `imagesUrl`** → **removed entirely** (not migrated)
- **`transitionProfile`** → added as `transitionprofileId` FK on `Film` entity (Option A). Stored in DB, required on create, used to look up the correct transition graph per film.
- **`childRollCount`** → computed from `films` table query (not persisted)
- **`isErrorCorrection`** → metadata on backward transitions (Phase 5 concern; removed from UI for now)
- **`isRollScoped`, `isStockScoped`** on Tag → **removed entirely** (all tags are universal)
- **Typeahead endpoints** → `GET /emulsions/brands` and `GET /emulsions/manufacturers` added as repository methods

### Phase 4 — Update the UI ✅

- [x] Rewrote `types/index.ts` — new `Film`, `Emulsion`, `Format`, `Package`, `Process`, `Tag`, `FilmState`, `FilmTag`, `EmulsionTag`, `TransitionProfile` types + `currentStateName()` helper
- [x] Rewrote `api-client.ts` — `formatApi`, `packageApi`, `processApi`, `emulsionApi`, `filmApi`, `filmTagApi`, `emulsionTagApi`, `filmStateApi`, `tagApi`, `transitionApi.getProfiles()`
- [x] Rewrote `FilmFormatsView.vue` — `formatApi` + `packageApi`, Package dropdown in create form
- [x] Rewrote `StocksView.vue` — `emulsionApi` + `formatApi` + `processApi`, process/format lookup maps
- [x] Rewrote `TagsView.vue` — removed scope fields and scope-change warning modal
- [x] Rewrote `RollsView.vue` — `filmApi`, transition profiles dropdown, bulk film detection by `transitionprofileId`
- [x] Rewrote `RollDetailView.vue` — simplified transition UI (date + note only), history from `film.states`, `filmTagApi`
- [x] Rewrote `Dashboard.vue` — `filmApi` + `emulsionApi`, state from `currentStateName()`
- [x] Updated all view spec files to match new API surface and types
- [x] All 132 UI tests pass; all 33 API tests pass; lint clean

### Phase 5 — Environment + Docker

- [ ] Update `.env.example` with new variable names
- [ ] Update `docker-compose.yml` and `docker-compose.dev.yml` to use new env var names
- [ ] Verify new DB table names match what the Knex repositories query (`film`, `emulsion`, `film_tag`, `emulsion_tag`, `format`, `package`, `process`)
- [ ] Audit migrations to ensure schema matches new table names

---

## Quick Reference: Old → New Route Mapping

| UI currently calls | Should become | Status |
|---|---|---|
| `GET /film-formats` | `GET /formats` (+ packages) | ✅ Phase 1 |
| `POST /film-formats` | `POST /formats` | ✅ Phase 1 |
| `DELETE /film-formats/:key` | `DELETE /formats/:id` | ✅ Phase 1 |
| `GET /packages` | `GET /packages` | ✅ Phase 1 |
| `GET /stocks` | `GET /emulsions` | ✅ Phase 1 |
| `POST /stocks/bulk` | `POST /emulsions/bulk` | ✅ Phase 1 |
| `DELETE /stocks/:key` | `DELETE /emulsions/:id` | ✅ Phase 1 |
| `GET /stocks/brands` | `GET /emulsions/brands` | ✅ Phase 1 |
| `GET /stocks/manufacturers` | `GET /emulsions/manufacturers` | ✅ Phase 1 |
| `GET /tags` | `GET /tags` | ✅ Phase 1 |
| `POST /tags` | `POST /tags` | ✅ Phase 1 |
| `PATCH /tags/:key` | `PATCH /tags/:id` | ✅ Phase 1 |
| `DELETE /tags/:key` | `DELETE /tags/:id` | ✅ Phase 1 |
| `GET /stock-tags` | `GET /emulsion-tags` | ✅ Phase 1 |
| `POST /stock-tags` | `POST /emulsion-tags` | ✅ Phase 1 |
| `DELETE /stock-tags/:key` | `DELETE /emulsion-tags/:id` | ✅ Phase 1 |
| `GET /roll-tags` | `GET /film-tags` | ✅ Phase 1 |
| `POST /roll-tags` | `POST /film-tags` | ✅ Phase 1 |
| `DELETE /roll-tags/:key` | `DELETE /film-tags/:id` | ✅ Phase 1 |
| `GET /rolls` | `GET /films` | ✅ Phase 1 |
| `POST /rolls` | `POST /films` | ✅ Phase 1 |
| `GET /rolls/:key` | `GET /films/:id` | ✅ Phase 1 |
| `GET /rolls/:key/children` | `GET /films/:id/children` | ✅ Phase 1 |
| `PATCH /rolls/:key` | `PATCH /films/:id` | ✅ Phase 1 |
| `DELETE /rolls/:key` | `DELETE /films/:id` | ✅ Phase 1 |
| `POST /rolls/:key/transition` | `POST /films/:id/transition` | ✅ Phase 1 |
| `GET /transitions` | `GET /transitions?profile=` | ✅ Phase 1 |
| `GET /transitions/profiles` | `GET /transitions/profiles` | ✅ Phase 3/4 |
| `GET /processes` | `GET /processes` | ✅ Phase 1 |
| `GET /roll-states` | `GET /film-states?filmId=` | ✅ Phase 1 |
