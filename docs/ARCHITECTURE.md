# Architecture

## Layer Boundaries
- `apps/api/src/domain` is pure TypeScript and must not import NestJS, MikroORM, or transport/framework concerns.
- `apps/api/src/modules` owns HTTP concerns (routing, guards, DTO parsing) and delegates business rules to services.
- `apps/api/src/infrastructure` owns persistence entities, repositories, mappers, migrations, and seeds.
- `apps/ui` consumes API contracts from `packages/schema` and must not duplicate backend domain rules.
- `packages/schema` is the shared contract layer and should be the only place where request/response shape types are defined.

## Reference vs User Data
- Reference tables are globally shared (`film_format`, `development_process`, `package_type`, `film_state`, `storage_location`, `slot_state`, `receiver_type`, `holder_type`, `emulsion`) and exposed as authenticated read-only endpoints.
- User-owned tables include `user_id` and every repository query on those tables is scoped by `userId`.
- Cross-user lookups return `404` to avoid leaking existence.
- Future admin mutation endpoints for reference data should live in a dedicated module with elevated authorization.

## ID Strategy
- All entities use SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`.
- IDs are serialized as numeric JSON values across API and UI.
- No UUIDs or string IDs are used in runtime contracts.

## Date Strategy
- API boundaries use ISO 8601 strings (`z.iso.datetime()`).
- SQLite stores date/time values as `TEXT`.
- `Date` objects are limited to runtime internals only (for timestamp creation) and are serialized immediately at boundaries.

## Film State Machine
- State transitions are encoded in a map (`from -> allowed to[]`) via `applyFilmTransition`.
- `stored -> stored` is explicitly allowed for storage-location changes.
- Backward transitions and undefined skips are rejected with `DomainError`.
- Film archival is a state transition (`archived`) through journey events; film hard-delete is intentionally not supported.

## Event Model
- `film_journey_event` is append-only history.
- `film.current_state_id` is a denormalized cache for current status.
- Event creation, current-state updates, and holder-slot side effects execute in one DB transaction.
- Event payloads are validated against per-state Zod schemas before persistence.

## FilmReceiver CTI
- Base table: `film_receiver`; subtype tables: `camera`, `interchangeable_back`, `film_holder`.
- Writes create base + subtype rows in one transaction.
- Reads join base and subtype data and map to discriminated union types.

## FilmHolderSlot State
- Slot state is persisted independently from film state (`empty`, `loaded`, `exposed`, `removed`).
- Slot transitions are triggered by film journey events (`loaded`, `exposed`, `removed`).
- Loading a previously removed slot creates a new slot cycle record to preserve history.

## Swagger/OpenAPI
- Swagger UI is mounted at `/api/docs`.
- OpenAPI JSON is served at `/api/docs-json`.
- Zod schemas power request/response contracts and runtime validation through shared schema package usage.

## API Envelope
- Successful responses are wrapped as `{ data, meta }` by a global interceptor.
- Error responses are wrapped as `{ error: { code, message, details } }` by filters/exception handlers.

## Idempotency
- `POST /film`, `POST /film/:id/events`, and `POST /receivers` support idempotent replay with an `Idempotency-Key` header.
- Keys are scoped by `(userId, scope, key)` and persisted in `idempotency_key`.
- Reusing the same key with identical payload returns the original response without creating a duplicate row.
- Reusing the same key with a different payload returns `409 CONFLICT`.

## Naive UI Constraint
- UI relies on Naive UI layout/components and token-driven styling.
- Custom CSS is intentionally avoided to keep styling consistent and centralized.

## Adding A New Event Type
1. Add/seed any required reference data.
2. Add event payload schema variant in `packages/schema`.
3. Extend transition map and domain tests.
4. Add service preconditions and transactional side effects.
5. Expose via API endpoints and update OpenAPI docs.
6. Load supporting reference data in UI store.
7. Extend dynamic event form rendering and timeline display logic.
