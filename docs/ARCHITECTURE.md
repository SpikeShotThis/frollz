# Architecture

## Monorepo Layout

```
frollz/
├── apps/
│   ├── api/          — NestJS + Fastify backend
│   ├── web/          — Next.js + React web app
│   └── mobile/       — Expo + React Native mobile app
└── packages/
    └── schema/       — Shared Zod contracts (source of truth for all types)
```

Build system: **Turborepo**. Package manager: **pnpm** (never npm or yarn).

---

## Layer Boundaries

| Layer | Path | Responsibility |
|---|---|---|
| Schema | `packages/schema` | Zod schemas, TypeScript types, `filmTransitionMap`, `filmFormatDefinitions`. No runtime dependencies other than `zod`. |
| Domain | `apps/api/src/domain` | Pure TypeScript business logic. Must not import NestJS, MikroORM, or transport concerns. Contains `applyFilmTransition`, `DomainError`, cost allocation. |
| Infrastructure | `apps/api/src/infrastructure` | MikroORM entities, repositories, mappers, migrations, seeds, `database-runtime.ts`. |
| Modules | `apps/api/src/modules` | NestJS modules: HTTP routing, guards, request parsing, controller → service delegation. |
| Web | `apps/web` | Next.js + React. Consumes `packages/schema`, `packages/contracts`, and `packages/api-client`. Must not duplicate backend domain rules. |

**Key constraint**: the domain layer must remain framework-free. If you need to call business logic from a test without spinning up NestJS, the domain layer is where that logic lives.

---

## API Modules

| Module | Controller prefix | Responsibility |
|---|---|---|
| `film` | `GET/PATCH /film` | Film list, detail, update, events, frames |
| `film` | `POST /film/lots` | FilmLot creation (the correct entry point for all film creation) |
| `film` | `POST /film/:id/events` | Append film journey events |
| `film` | `GET /film/:id/events` | Fetch film journey events |
| `film` | `GET /film/:id/frames` | Fetch film frames |
| `film` | `PATCH /film/:id/frames/:frameId` | Update per-frame exposure metadata |
| `film` | `POST /film/:id/frames/:frameId/events` | Append frame journey events |
| `devices` | `/devices` | CRUD for FilmDevice (camera, back, holder), load event timeline, mount/unmount |
| `film-labs` | `/film-labs` | CRUD for FilmLab |
| `film-suppliers` | `/film-suppliers` | CRUD for FilmSupplier |
| `reference` | `/reference` | Read-only reference data (formats, states, package types, etc.) |
| `emulsions` | `/emulsions` | Read-only emulsion catalog |
| `auth` | `/auth` | Register, login, refresh, logout, current user |
| `admin` | `/admin` | Admin-only operations (seeding, reference data management) |

`POST /film` is **deprecated** and must not be used. All film creation goes through `POST /film/lots`.

---

## Reference vs User Data

- Reference tables (`film_format`, `development_process`, `package_type`, `film_state`, `storage_location`, `slot_state`, `device_type`, `holder_type`, `emulsion`) are globally shared, seeded at startup, and exposed as authenticated read-only endpoints.
- User-owned tables include `user_id` and every repository query on those tables is scoped by `userId`.
- Cross-user lookups return `404` to avoid leaking existence.
- Future admin mutation endpoints for reference data live in the `admin` module with elevated authorization.

---

## ID Strategy

- All entities use `INTEGER PRIMARY KEY AUTOINCREMENT`.
- IDs are serialized as numeric JSON values across API and web clients.
- No UUIDs or string IDs are used in runtime contracts.

---

## Date Strategy

- API boundaries use ISO 8601 strings validated by `isoDateTimeSchema` (`z.iso.datetime()`).
- The database stores date/time values as `TEXT`.
- `Date` objects are limited to runtime internals only (for timestamp creation) and are serialized immediately at mapper boundaries.

---

## Film State Machine

- The canonical transition map is `filmTransitionMap` in `packages/schema/src/film.ts`.
- The API re-exports it from `apps/api/src/domain/film/film-state-machine.ts` and exposes `applyFilmTransition(currentStateCode, incomingStateCode)` which returns either the new state code or a `DomainError`.
- `stored → stored` is explicitly allowed for storage-location changes.
- Backward transitions and undefined skips are rejected with `DomainError`.
- Film archival is terminal (`archived`). Hard-delete of film records is not supported.

---

## Event Model

- `film_journey_event` is append-only history for film-level state changes.
- `frame_journey_event` is append-only history for frame-level state changes.
- `film.current_state_id` is a denormalized cache updated atomically with each event insert.
- `film.current_device_id` is a denormalized cache set on `loaded` and cleared on `removed`.
- Event creation, current-state updates, and holder-slot side effects all execute in a single DB transaction.
- Event payloads are validated against per-state Zod schemas from `packages/schema` before persistence.

---

## FilmDevice CTI (Class Table Inheritance)

- Base table: `film_device`; subtype tables: `camera`, `interchangeable_back`, `film_holder`.
- Writes create the base row and the appropriate subtype row in a single transaction.
- Reads join the base and subtype data and map to a discriminated union (`filmDeviceSchema` in `packages/schema`).
- The discriminator is `deviceTypeCode` (`'camera'`, `'interchangeable_back'`, `'film_holder'`).

---

## FilmHolderSlot State

- Slot state (`empty`, `loaded`, `exposed`, `removed`) is persisted independently from film state.
- Slot transitions are triggered by film journey events (`loaded`, `exposed`, `removed`).
- Loading a slot that was previously `removed` creates a **new slot cycle record** rather than mutating the existing one, preserving full load history.
- `film_holder_slot.slot_state_code` is a denormalized copy of the slot state code for efficient querying.

---

## Film Format Definition System

`packages/schema/src/film-format-definition.ts` is a static catalog — not a database table — that drives:

- Web format and package-type selection dropdowns
- Frame count resolution at load time (`resolveNonLargeFrameCount`)
- Validation of frame size / package type combinations

The catalog is keyed by the `film_format.code` values from the database (e.g. `'35mm'`, `'120'`, `'4x5'`). Both API and web clients consume it directly from `packages/schema`.

---

## Database Runtime

`apps/api/src/infrastructure/database-runtime.ts` contains `resolveDatabaseRuntime()`, which selects the database driver at startup:

| Condition | Runtime |
|---|---|
| `DATABASE_DRIVER=postgres` or `postgresql` | Postgres |
| `DATABASE_DRIVER=sqlite` | SQLite |
| `DATABASE_URL` starts with `postgres://` or `postgresql://` | Postgres |
| `DATABASE_URL` is set (other value) | SQLite |
| `DATABASE_HOST` is set | Postgres |
| Nothing set | SQLite (default for local dev) |

Never hardcode a database assumption. All persistence code must work with both drivers.

---

## API Envelope

- Successful responses are wrapped as `{ data, meta }` by a global response interceptor.
- Error responses are wrapped as `{ error: { code, message, details } }` by a global exception filter.

---

## Idempotency

- All mutating endpoints require an `Idempotency-Key` header.
- Keys are scoped by `(userId, scope, key)` and persisted in `idempotency_key` with a TTL.
- Replaying the same key with the same body returns the cached response without creating a duplicate.
- Replaying the same key with a different body returns `409 CONFLICT`.

---

## Swagger / OpenAPI

- Swagger UI is mounted at `/api/docs`.
- OpenAPI JSON is served at `/api/docs-json`.
- Zod schemas power both runtime validation and the OpenAPI contract via the shared schema package.

---

## Web Architecture

- Next.js App Router + React 19.
- Routes live in `apps/web/app/`; reusable domain components live in `apps/web/src/components/`.
- Auth/session state is provided by `apps/web/src/auth/session.tsx` and `AppProviders`.
- API access goes through `@frollz2/api-client` from `apps/web/src/api.ts` and session-scoped clients.
- Styling lives in `apps/web/app/globals.css` and shared tokens from `@frollz2/design-tokens`.
- Types consumed directly from `packages/schema` — never duplicated in the web app.
- `filmTransitionMap` from `packages/schema` drives which event form options are shown to the user in `FilmEventForm.tsx`.

---

## Adding a New Event Type

1. Add or seed any required reference data (e.g. a new storage location or state code).
2. Add the event payload Zod schema variant in `packages/schema/src/film.ts`.
3. Extend `filmTransitionMap` and add domain tests in `apps/api/src/domain/__tests__/`.
4. Add service preconditions and transactional side effects in `FilmService`.
5. Expose via the appropriate controller and update OpenAPI docs.
6. Load any new supporting reference data through `@frollz2/api-client` in the relevant web component or hook.
7. Add or update the relevant React sub-form in `apps/web/src/components/FilmEventForm.tsx`.
