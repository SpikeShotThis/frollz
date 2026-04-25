# Analog Film Tracker — Full-Stack Build Prompt

## 0. Instructions for the AI

Produce real, runnable code — not pseudocode, stubs, or skeletons. Every file must compile,
pass linting, and be wired together correctly. Where a file is too long to show in full,
provide the complete structure with all non-trivial logic present and note clearly what was
abbreviated. Never silently omit business-critical sections. Explain significant design
decisions inline or in a `## Design Decisions` block at the end. All installed packages must
be their lated versions.

---

## 1. Project Overview

Build a **multi-user analog film tracking system**. Each authenticated user has their own
fully isolated dataset. The system enables users to:

- Browse shared **reference data** — emulsions, film formats, development processes, and
  other lookup tables seeded into the database
- Create and track individual physical **Film** instances through a rich lifecycle state
  machine backed by reference data
- Manage **FilmReceivers** (cameras, interchangeable backs, film holders with independently
  tracked slots)
- Record **FilmJourneyEvents** — an append-only history log of every state transition,
  each carrying state-specific structured data

Authentication is required for all endpoints. All user-owned data is fully isolated per
user. Reference data is shared across all users and is read-only in the MVP.

---

## 2. Tech Stack — Strictly Enforced

| Concern | Choice |
|---|---|
| Language | TypeScript (`strict: true` everywhere, no `any`) |
| Runtime | Node.js v24 LTS |
| Package manager | pnpm |
| Monorepo orchestration | Turborepo |

### Backend (`apps/api`)
| Concern | Choice |
|---|---|
| Framework | NestJS |
| HTTP adapter | Fastify |
| ORM | MikroORM |
| Database | SQLite via `better-sqlite3` |
| Validation | Zod via `nestjs-zod` |
| API docs | `@nestjs/swagger` + `nestjs-zod` bridge |
| Auth | JWT — access token + refresh token pair |

### Frontend (`apps/ui`)
| Concern | Choice |
|---|---|
| Framework | Vue 3, Composition API only (`<script setup>`) |
| Build tool | Vite |
| UI component library | Quasar UI — **zero custom CSS** (see Section 10) |
| Store | Pinia |

### Shared packages
| Package | Purpose |
|---|---|
| `packages/schema` | Zod schemas — single source of truth for api and ui |
| `packages/typescript-config` | Shared `tsconfig` bases |
| `packages/eslint-config` | Shared ESLint flat config |
| `packages/vitest-config` | Shared Vitest config |

No other significant dependencies without explicit justification.

---

## 3. Monorepo Structure — Follow Exactly

```
/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── film/
│   │   │   │   │   ├── film.types.ts
│   │   │   │   │   ├── film-journey.types.ts
│   │   │   │   │   └── film-state-machine.ts
│   │   │   │   ├── receiver/
│   │   │   │   │   └── receiver.types.ts
│   │   │   │   ├── reference/
│   │   │   │   │   └── reference.types.ts
│   │   │   │   └── errors.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── entities/
│   │   │   │   ├── repositories/
│   │   │   │   ├── mappers/
│   │   │   │   └── database.module.ts
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── reference/       # read-only reference data endpoints
│   │   │       ├── film/
│   │   │       └── receivers/
│   │   ├── test/
│   │   └── mikro-orm.config.ts
│   └── ui/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── composables/
│       │   └── router/
│       └── vite.config.ts
├── packages/
│   ├── schema/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── vitest-config/
├── docs/
│   └── ARCHITECTURE.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. ID Strategy — All Tables

Every table uses **SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`**. IDs are exposed as
`number` in TypeScript and serialised as `number` in all JSON payloads. No UUIDs anywhere.

```ts
// Correct — used everywhere
id: number

// Wrong — never use
id: string  // no UUIDs, no zero-padded strings
```

---

## 5. Date / Time Strategy — All Boundaries

All date and time values that cross the API boundary (request bodies, response payloads)
are **ISO 8601 datetime strings**. Use `z.iso.datetime()` in all Zod schemas. The
database stores datetimes as `TEXT` in ISO 8601 format. No `Date` objects appear in DTOs,
Zod schemas, or domain types — only in MikroORM entity internals where the ORM requires it,
and mappers convert immediately.

```ts
// Correct in Zod schemas and domain types
occurredAt: string   // z.iso.datetime()

// Wrong
occurredAt: Date
```

---

## 6. Database Architecture — Reference Data vs User Data

### 6.1 Reference Data Tables

Reference data is **seeded once, shared across all users, and read-only in the MVP**.
It has no `userId` column. Admin write endpoints are noted as future scope but **not
implemented** in the MVP — only GET endpoints are built.

All reference data endpoints require authentication (JWT). They are served under
`/api/v1/reference/`.

The following are reference data tables:

| Table | Purpose | Seed values |
|---|---|---|
| `film_format` | Physical film formats | `35mm`, `120`, `220`, `4x5`, `2x3`, `8x10`, `InstaxMini`, `InstaxWide`, `InstaxSquare` |
| `development_process` | Lab chemistry processes | `C41`, `E6`, `ECN2`, `BW` |
| `package_type` | How film is sold, scoped to format | See Section 6.2 |
| `film_state` | Valid states in the film lifecycle | `purchased`, `stored`, `loaded`, `exposed`, `removed`, `sent_for_dev`, `developed`, `scanned`, `archived` |
| `storage_location` | Where film is physically kept | `freezer`, `refrigerator`, `shelf`, `other` |
| `slot_state` | State of a FilmHolder slot | `empty`, `loaded`, `exposed`, `removed` |
| `receiver_type` | FilmReceiver subtypes | `camera`, `interchangeable_back`, `film_holder` |
| `emulsion` | Film stock definitions | See Section 9 |

All reference tables have the shape:
```sql
id    INTEGER PRIMARY KEY AUTOINCREMENT
code  TEXT NOT NULL UNIQUE   -- machine identifier, e.g. "C41"
label TEXT NOT NULL          -- human label, e.g. "C-41 (Colour Negative)"
```
Additional columns per table are specified below.

### 6.2 `package_type` Reference Table

Extends base with:
```sql
film_format_id  INTEGER NOT NULL REFERENCES film_format(id)
```

Valid `(filmFormat.code, packageType.code)` combinations:

| Film Format | Package Type codes |
|---|---|
| `35mm` | `24exp`, `36exp`, `100ft_bulk` |
| `120` | `roll` |
| `220` | `roll` |
| `4x5`, `2x3`, `8x10` | `10sheets`, `25sheets`, `50sheets` |
| `InstaxMini`, `InstaxWide`, `InstaxSquare` | `pack` |

The DB foreign key from `film.package_type_id` → `package_type.id` enforces validity.
No application-level enum validation is needed beyond `z.string()`.

### 6.3 `emulsion` Reference Table

```sql
id                    INTEGER PRIMARY KEY AUTOINCREMENT
brand                 TEXT NOT NULL        -- e.g. "Gold" (no ISO speed in name)
manufacturer          TEXT NOT NULL        -- e.g. "Kodak"
iso_speed             INTEGER NOT NULL
development_process_id INTEGER NOT NULL REFERENCES development_process(id)
balance               TEXT NOT NULL        -- "daylight" | "tungsten"
```

Emulsion ↔ FilmFormat is a many-to-many join table `emulsion_film_format`:
```sql
emulsion_id     INTEGER NOT NULL REFERENCES emulsion(id)
film_format_id  INTEGER NOT NULL REFERENCES film_format(id)
PRIMARY KEY (emulsion_id, film_format_id)
```

### 6.4 User Data Tables

User data tables all carry a `user_id INTEGER NOT NULL REFERENCES user(id)` column.
Every query against these tables **must** include a `WHERE user_id = ?` clause.

User data tables: `film`, `film_receiver`, `camera`, `interchangeable_back`,
`film_holder`, `film_journey_event`, `film_holder_slot`.

---

## 7. Authentication

### Strategy
- Access token: short-lived (15 min), HS256 JWT, payload `{ sub: userId, email }`
- Refresh token: long-lived (30 days), stored **hashed** in `refresh_tokens` table;
  rotated on every use — old token invalidated immediately
- `JwtAuthGuard` applied globally; auth endpoints use `@Public()` decorator to opt out
- `@CurrentUser()` param decorator extracts `userId` from the validated JWT

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | No | `{ email, password, name }` → creates user, returns token pair |
| POST | `/api/v1/auth/login` | No | `{ email, password }` → returns token pair |
| POST | `/api/v1/auth/refresh` | No | `{ refreshToken }` → new token pair, old invalidated |
| POST | `/api/v1/auth/logout` | Yes | Invalidates stored refresh token |
| GET | `/api/v1/auth/me` | Yes | Returns current user (never includes `passwordHash`) |

### Rules
- Passwords hashed with `bcrypt`, cost factor 12; never returned in any response
- Services receive `userId: number` from controllers via `@CurrentUser()` and pass it
  into every user-data repository call
- Every user-data DB query filters by `userId` — return 404 (not 403) for cross-user
  resource attempts to avoid leaking existence

### `user` table
```sql
id             INTEGER PRIMARY KEY AUTOINCREMENT
email          TEXT NOT NULL UNIQUE
name           TEXT NOT NULL
password_hash  TEXT NOT NULL
created_at     TEXT NOT NULL   -- ISO 8601
```

---

## 8. Domain Model

`apps/api/src/domain/` is **pure TypeScript — zero imports from NestJS, MikroORM, or any
framework**. All domain types are inferred via `z.infer<>` from Zod schemas in
`packages/schema`. No type is ever defined twice.

Since formerly-enum values are now reference data, domain types use `string` for all
reference FK fields. The DB foreign keys enforce valid values; Zod uses `z.string()` for
these fields with no enum constraint.

### 8.1 Emulsion (reference data domain type)
```ts
{
  id: number
  brand: string
  manufacturer: string
  isoSpeed: number
  developmentProcessId: number
  developmentProcess: string    // code, joined for display
  balance: string               // "daylight" | "tungsten" — stored as text, no enum
  filmFormats: { id: number; code: string; label: string }[]
}
```

### 8.2 Film
```ts
{
  id: number
  userId: number
  name: string                  // user-defined label
  emulsionId: number
  packageTypeId: number
  filmFormatId: number          // must match packageType.filmFormatId — enforced by service
  expirationDate: string | null // ISO 8601 date string
  currentStateId: number        // FK to film_state reference table; denormalized cache
  currentStateCode: string      // joined for display, e.g. "loaded"
}
```

Business rules (enforced in service layer, not controllers):
- `filmFormatId` must match the `filmFormatId` of the resolved `packageType` — reject
  at creation with a domain error if they differ
- Deletion only permitted when `currentStateCode` is `purchased` or `archived`
- `currentStateId` is updated atomically in the same transaction as each new event insert

### 8.3 Film State Machine

#### Valid transitions

| From | To | Notes |
|---|---|---|
| `purchased` | `stored` | Standard path |
| `purchased` | `loaded` | **Skip allowed** — bought and loaded same day |
| `stored` | `stored` | **Self-transition allowed** — location change (e.g. thaw workflow). New event; `currentState` stays `stored`. |
| `stored` | `loaded` | |
| `loaded` | `exposed` | Shooting complete; film stays physically in receiver |
| `exposed` | `removed` | Film physically removed; slot freed atomically |
| `removed` | `stored` | Re-storing a roll |
| `removed` | `sent_for_dev` | |
| `sent_for_dev` | `developed` | No intermediate developing state |
| `developed` | `scanned` | |
| `developed` | `archived` | Skip scan |
| `scanned` | `archived` | |

All other transitions — including all backwards transitions and all unenumerated skips —
are rejected with a `DomainError`.

**Critical:** `stored → stored` is the only valid self-transition. All others are invalid.

Enforce in a pure domain function:
```ts
function applyFilmTransition(
  currentStateCode: string,
  incomingStateCode: string
): string | DomainError   // returns new state code or error
```

The transition table is encoded as a `Map<string, string[]>` of valid `from → [to...]`
entries — not as a chain of if/else or switch statements.

### 8.4 FilmJourneyEvent
```ts
{
  id: number
  filmId: number
  userId: number
  filmStateId: number         // FK to film_state
  filmStateCode: string       // joined for display
  occurredAt: string          // ISO 8601 datetime
  recordedAt: string          // ISO 8601 datetime — set by server on insert
  notes: string | null
  eventData: Record<string, unknown>  // state-specific structured data (see below)
}
```

Events are **immutable once written**. The `eventData` JSON column holds state-specific
fields, serialised and deserialised using per-state Zod schemas. The authoritative
`eventData` schemas per state are:

| State code | eventData fields |
|---|---|
| `purchased` | `{}` |
| `stored` | `{ storageLocationId: number, storageLocationCode: string }` |
| `loaded` | `{ receiverId: number, slotSideNumber: number \| null, intendedPushPull: number \| null }` |
| `exposed` | `{}` |
| `removed` | `{}` |
| `sent_for_dev` | `{ labName: string \| null, labContact: string \| null, actualPushPull: number \| null }` |
| `developed` | `{ labName: string \| null, actualPushPull: number \| null }` |
| `scanned` | `{ scannerOrSoftware: string \| null, scanLink: string \| null }` |
| `archived` | `{}` |

Define a Zod discriminated union in `packages/schema` keyed on `filmStateCode` covering
all nine event data shapes. The service layer validates incoming `eventData` against the
correct sub-schema before persisting.

### 8.5 FilmReceiver — CTI (Class Table Inheritance)

**Base table `film_receiver`:**
```sql
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
receiver_type_id INTEGER NOT NULL REFERENCES receiver_type(id)
film_format_id   INTEGER NOT NULL REFERENCES film_format(id)
frame_size       TEXT NOT NULL
```

**Subtype table `camera`:**
```sql
film_receiver_id  INTEGER PRIMARY KEY REFERENCES film_receiver(id)
make              TEXT NOT NULL
model             TEXT NOT NULL
serial_number     TEXT
date_acquired     TEXT        -- ISO 8601 date string
```

**Subtype table `interchangeable_back`:**
```sql
film_receiver_id  INTEGER PRIMARY KEY REFERENCES film_receiver(id)
name              TEXT NOT NULL
system            TEXT NOT NULL
```

**Subtype table `film_holder`:**
```sql
film_receiver_id  INTEGER PRIMARY KEY REFERENCES film_receiver(id)
name              TEXT NOT NULL
brand             TEXT NOT NULL
holder_type_id    INTEGER NOT NULL REFERENCES holder_type(id)
  -- holder_type is a small reference table: standard | grafmatic | readyload | quickload
```

Every FilmReceiver read joins `film_receiver` with the appropriate subtype table.
Every FilmReceiver write inserts into `film_receiver` first (to get the ID), then into
the subtype table — both in a single transaction.

Domain types for each subtype are discriminated unions keyed on `receiverTypeCode`.

### 8.6 FilmHolderSlot — Independent Persisted State

```sql
-- film_holder_slot table
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
film_receiver_id INTEGER NOT NULL REFERENCES film_holder(film_receiver_id)
side_number      INTEGER NOT NULL
slot_state_id    INTEGER NOT NULL REFERENCES slot_state(id)
slot_state_code  TEXT NOT NULL   -- denormalized for query efficiency
loaded_film_id   INTEGER REFERENCES film(id)
created_at       TEXT NOT NULL   -- ISO 8601
```

Slot state is **independent from `Film.currentStateCode`** — it has its own transitions
driven by film journey events:

| Film journey event | Slot transition | Pre-condition |
|---|---|---|
| `loaded` (targeting this receiver + side) | `empty` → `loaded` | Slot must be `empty` |
| `exposed` | `loaded` → `exposed` | |
| `removed` | `exposed` → `removed` | Slot is now free |

**A slot is available** when no record exists for that `(film_receiver_id, side_number)`
pair, or when the most recent such record has `slot_state_code = "removed"`.

When a new film is loaded into a slot that was previously `removed`, **create a new
`film_holder_slot` record** — do not update the old one. This preserves load cycle history.

All slot state updates happen in the **same transaction** as the corresponding
`film_journey_event` insert and `film.current_state_id` update.

---

## 9. Swagger / OpenAPI Documentation

- Use `@nestjs/swagger` with the `nestjs-zod` bridge (`zodToOpenAPI`) so Zod schemas
  automatically generate OpenAPI schemas — no manual `@ApiProperty()` decorators needed
- Swagger UI served at `/api/docs`
- OpenAPI JSON spec exported at `/api/docs-json`
- Every controller method must have `@ApiOperation({ summary: '...' })` and appropriate
  `@ApiResponse()` decorators
- The Swagger setup must document all request bodies, response shapes, and error envelopes

---

## 10. API Design

All routes prefixed `/api/v1`. All endpoints require `Authorization: Bearer <token>`
unless marked `@Public()`.

### Architecture rule — controllers vs services
Controllers handle HTTP concerns only: parse the request, validate the DTO via Zod pipe,
call the service, return the response. **All business rule enforcement lives in the service
layer.** Services are the only layer that throws `DomainError`. Controllers never contain
`if` statements for business logic.

### Reference Data (read-only in MVP)
| Method | Path | Description |
|---|---|---|
| GET | `/reference/film-formats` | All film formats |
| GET | `/reference/development-processes` | All development processes |
| GET | `/reference/package-types` | All package types (include filmFormat joined) |
| GET | `/reference/film-states` | All film states |
| GET | `/reference/storage-locations` | All storage locations |
| GET | `/reference/slot-states` | All slot states |
| GET | `/reference/receiver-types` | All receiver types |
| GET | `/reference/emulsions` | All emulsions (include filmFormats + developmentProcess joined) |
| GET | `/reference/emulsions/:id` | Single emulsion |

### Film
| Method | Path | Description |
|---|---|---|
| GET | `/film` | List user's film; filters: `?stateCode=&filmFormatId=&emulsionId=` |
| GET | `/film/:id` | Get one; inline emulsion + latest event |
| POST | `/film` | Create Film; auto-creates first `purchased` event |
| PATCH | `/film/:id` | Update `name` or `expirationDate` only |
| POST | `/film/:id/events` | Add a journey event (state transition) |
| GET | `/film/:id/events` | Full event history, `occurredAt ASC` |
| DELETE | `/film/:id` | Only if `currentStateCode` is `purchased` or `archived` |

**`POST /film/:id/events` request body:**
```ts
{
  filmStateCode: string   // target state — validated against state machine by service
  occurredAt: string      // ISO 8601 datetime
  notes?: string
  eventData: Record<string, unknown>  // validated against per-state schema by service
}
```

Service pre-conditions before writing a `loaded` event:
- Receiver exists and belongs to user
- Receiver's `filmFormatId` matches `film.filmFormatId`
- If Camera or InterchangeableBack: no other film in `loaded` or `exposed` state for
  this receiver
- If FilmHolder: `slotSideNumber` present in `eventData`; identified slot is `empty`

Service side-effects for a `removed` event:
- Advance the associated `FilmHolderSlot.slotStateCode` to `removed` (or free Camera/Back)
- All in the same transaction

### FilmReceivers
| Method | Path | Description |
|---|---|---|
| GET | `/receivers` | Unified list; FilmHolders include current slot states |
| GET | `/receivers/:id` | Get one; FilmHolder includes full slot history |
| POST | `/receivers` | Create (CTI: inserts base + subtype in transaction) |
| PATCH | `/receivers/:id` | Update |
| DELETE | `/receivers/:id` | Block (409) if any film is `loaded` or `exposed` here |

### Response envelope
```json
{ "data": <payload>, "meta": {} }
```
```json
{ "error": { "code": "VALIDATION_ERROR|NOT_FOUND|CONFLICT|FORBIDDEN|UNAUTHORIZED|DOMAIN_ERROR", "message": "...", "details": [] } }
```
HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 500.

---

## 11. Frontend

###Quasar UI Styling — Hard Constraint

**Zero custom CSS anywhere in the frontend.** This means:
- No `.css` or `.scss` files
- No `<style>` blocks in Vue SFCs
- No `class` attributes on any element
- No `style` prop bindings for visual styling
- No Tailwind, UnoCSS, or any utility classes


If something cannot be achieved with Quasars UI's own API, choose a different Quasars
component — do not work around the constraint with custom CSS.

### Auth
- Unauthenticated users redirected to `/login`
- `accessToken` stored in Pinia (memory only, **never** localStorage); `refreshToken`
  in localStorage (document the security tradeoff in a code comment)
- `useApi` composable attaches `Authorization` header; on 401 transparently calls
  `/auth/refresh` and retries once before redirecting to `/login`
- Vue Router navigation guard protects all routes except `/login` and `/register`

### Reference Data Loading
- On app init (after login), fetch all reference tables once and store in a Pinia
  `useReferenceStore`
- All selects and dropdowns throughout the UI are populated from this store — never
  hardcoded strings or enums
- Reference store exposes typed getters: `filmFormats`, `emulsions`, `filmStates`,
  `storageLocations`, `packageTypesByFormat(filmFormatId)`, etc.

### Pages

#### `/film` — Film Inventory
- `NDataTable` with filters: state (multi-select from reference store), format
  (multi-select), emulsion (searchable select)
- Columns: name, emulsion brand, format code, package type code, state badge, current
  receiver + slot (if `loaded` or `exposed`)
- Row actions: add event (drawer), view detail, delete
- "Add Film" → creation drawer

#### `/film/:id` — Film Detail
- All film fields + current state badge
- **Journey timeline:** all events in `occurredAt ASC` order. Each entry shows: state
  badge, `occurredAt`, notes, and the `eventData` fields rendered per-state (lab name,
  push/pull, scan link, storage location, etc.)
- **Transition button:** shows only valid next states per the transition table (resolved
  from reference store); opens a drawer with the fields for that specific event type

#### Dynamic event creation form
Rendered fields depend on target `filmStateCode`. All options come from the reference
store — no hardcoded strings:
- `stored`: `NSelect` for `storageLocationId` (options from reference store)
- `loaded`: `NSelect` for `receiverId`, `NInputNumber` for `slotSideNumber` (if holder),
  `NInputNumber` for `intendedPushPull`
- `sent_for_dev`: `NInput` for `labName`, `labContact`, `NInputNumber` for
  `actualPushPull`
- `developed`: `NInput` for `labName`, `NInputNumber` for `actualPushPull`
- `scanned`: `NInput` for `scannerOrSoftware`, `scanLink`
- All states: `NDatePicker` for `occurredAt` (emits ISO 8601 string), `NInput` for
  `notes`

#### `/receivers` — Film Receiver Management
- Unified list with receiver type badge per row
- Camera / Back rows: show currently loaded film name (if `loaded` or `exposed`)
- FilmHolder rows: expandable via `NDataTable` nested — slot table with `sideNumber`,
  slot state badge, loaded film name
- Discriminated create/edit forms: `NSelect` for `receiverTypeId` drives which fields
  render

#### `/emulsions` — Emulsion Browser (read-only)
- `NDataTable` listing reference emulsions with format tags and process badge
- No create/edit/delete in MVP (reference data)

#### `/login`, `/register`
- `NForm`, `NFormItem`, `NInput`, `NButton` — no custom styling

### Film state badge colours
Use Quasars UI `NTag` `type` prop — do not set custom colours:

| State code | NTag type |
|---|---|
| `purchased` | `default` |
| `stored` | `info` |
| `loaded` | `primary` |
| `exposed` | `warning` |
| `removed` | `warning` |
| `sent_for_dev` | `info` |
| `developed` | `success` |
| `scanned` | `success` |
| `archived` | `default` |

### Forms
- Validated with Zod schemas from `packages/schema` via a `useZodForm` composable
  wrapping `z.safeParse`
- No heavy form library

---

## 12. Persistence Details

- MikroORM with SQLite (`better-sqlite3`)
- Provide an initial migration via MikroORM schema generator covering all tables
- `film_journey_event.event_data` → JSON TEXT column; service serialises/deserialises
  using per-state Zod schemas
- `emulsion_film_format` → explicit ManyToMany join table
- `refresh_tokens` table: `id | user_id | token_hash | created_at | expires_at`
- All `created_at`, `occurred_at`, `recorded_at`, `expires_at` columns stored as
  ISO 8601 TEXT

---

## 13. Seed Data

`apps/api/src/infrastructure/seed.ts` — idempotent (check before inserting), wired to
`pnpm db:seed`.

### Reference table seeds (all tables)

**`film_format`:** `35mm`, `120`, `220`, `4x5`, `2x3`, `8x10`, `InstaxMini`,
`InstaxWide`, `InstaxSquare`

**`development_process`:** `C41` → "C-41 (Colour Negative)", `E6` → "E-6 (Slide/Reversal)",
`ECN2` → "ECN-2 (Motion Picture)", `BW` → "Black & White"

**`package_type`:** all valid format/type combinations from Section 6.2

**`film_state`:** `purchased`, `stored`, `loaded`, `exposed`, `removed`, `sent_for_dev`,
`developed`, `scanned`, `archived`

**`storage_location`:** `freezer`, `refrigerator`, `shelf`, `other`

**`slot_state`:** `empty`, `loaded`, `exposed`, `removed`

**`receiver_type`:** `camera`, `interchangeable_back`, `film_holder`

**`holder_type`:** `standard`, `grafmatic`, `readyload`, `quickload`

**`emulsion`** (brand name does **not** include ISO speed — that is a separate column):

| Brand | Manufacturer | ISO | Process | Balance | Formats |
|---|---|---|---|---|---|
| Gold | Kodak | 200 | C41 | daylight | 35mm, 120 |
| Portra | Kodak | 400 | C41 | daylight | 35mm, 120 |
| Ektar | Kodak | 100 | C41 | daylight | 35mm, 120 |
| Tri-X | Kodak | 400 | BW | daylight | 35mm, 120 |
| HP5 Plus | Ilford | 400 | BW | daylight | 35mm, 120 |
| Delta | Ilford | 100 | BW | daylight | 35mm, 120 |
| Velvia | Fujifilm | 50 | E6 | daylight | 35mm, 120, 4x5 |
| Provia | Fujifilm | 100 | E6 | daylight | 35mm, 120 |
| 800T | CineStill | 800 | ECN2 | tungsten | 35mm, 120 |

### Demo user
`demo@example.com` / `password123` / name `Demo User`

---

## 14. Testing

### Domain unit tests (`apps/api/src/domain/__tests__/`)
- `applyFilmTransition`: every valid transition in the table returns the correct new
  state code; every invalid transition returns a `DomainError`
- `stored → stored` self-transition is valid; all other self-transitions are invalid
- Skip-forward `purchased → loaded` is valid; `purchased → developed` is invalid
- Film creation with mismatched `filmFormatId` vs `packageType.filmFormatId` throws
  a `DomainError` in the service
- `eventData` Zod schemas: valid payloads parse; invalid ones throw

### API integration tests (`apps/api/test/`)
Use real MikroORM with an in-memory SQLite database. No mocking.

| Test | Expected |
|---|---|
| Register + login | Returns access + refresh token pair |
| `GET /film` without token | 401 |
| `GET /reference/emulsions` without token | 401 |
| `POST /film` | Film created; `currentStateCode = "purchased"`; one `purchased` event |
| `POST /film/:id/events` `stored` (freezer) | Event + `currentState` updated |
| `POST /film/:id/events` `stored` (refrigerator) — self-transition | Second stored event; `currentState` still `stored` |
| `POST /film/:id/events` `loaded` | Event; `currentState = loaded`; slot `empty → loaded` |
| `POST /film/:id/events` `loaded` when slot occupied | 409 |
| `POST /film/:id/events` backwards transition | 422 |
| `POST /film/:id/events` invalid skip | 422 |
| `POST /film/:id/events` `exposed` | Slot `loaded → exposed`; receiver still occupied |
| `POST /film/:id/events` `removed` | Slot `exposed → removed`; receiver freed |
| `DELETE /receivers/:id` with film loaded | 409 |
| User A accessing User B's film | 404 |
| Full journey: `purchased → stored(freezer) → stored(refrigerator) → loaded → exposed → removed → sent_for_dev → developed → scanned → archived` | All 10 events; `currentState = archived`; slot reaches `removed` |

---

## 15. Developer Experience

| Command | Action |
|---|---|
| `pnpm dev` | `apps/api` + `apps/ui` in parallel watch mode via Turborepo |
| `pnpm build` | Build all in dependency order |
| `pnpm test` | Run all Vitest suites |
| `pnpm db:migrate` | Apply MikroORM migrations |
| `pnpm db:seed` | Run idempotent seed |

---

## 16. `docs/ARCHITECTURE.md` Must Cover

1. Layer boundaries — what imports are explicitly forbidden across each boundary and why
2. Reference data vs user data — which tables are which, how the split is enforced, and
   the plan for admin write endpoints in a future iteration
3. ID strategy — why autoincrement integers, and how they flow from DB to API to UI
4. Date strategy — ISO 8601 strings at all boundaries, where `Date` objects are permitted
5. Film state machine — full transition table, `stored` self-transition, skip-forward
   rules, how `applyFilmTransition` is structured, and `DomainError` propagation
6. `FilmJourneyEvent` append-only model — why `Film.currentState` is a denormalized cache,
   transactional write pattern, `eventData` JSON column + per-state Zod schema approach
7. FilmReceiver CTI — table structure, join pattern on read, two-table transaction on write
8. `FilmHolderSlot` independent state — the slot state enum, trigger mapping, new-record
   pattern for each load cycle
9. Swagger setup — how `nestjs-zod` bridge eliminates manual `@ApiProperty()` decorators
10. Quasar UI constraint — what is forbidden, what is permitted, how to handle edge cases
11. How to add a new event type end-to-end: reference table seed → Zod schema →
    transition table entry → `eventData` sub-schema → service pre-conditions →
    API → reference store → UI dynamic form field

---

## 17. Constraints and Priorities

1. **State machine correctness first.** Transition table, self-transition, skip-forwards,
   slot independence, and transactional atomicity before anything else.
2. **Reference data drives everything.** No hardcoded strings, enums, or type literals
   anywhere in application code — all lookup values come from the DB at runtime.
3. **Strong typing.** `strict: true`, no `any`, all domain types inferred from Zod.
4. **No duplicate type definitions.** One Zod schema per concept; all downstream types
   inferred.
5. **Event immutability.** `FilmJourneyEvent` records are never updated or deleted.
6. **Transactional consistency.** Event insert + `Film.currentState` update + slot
   side-effects always in one DB transaction.
7. **Zero custom CSS.** Quasars UI API only.
8. **Security.** bcrypt passwords, hashed refresh tokens, all user-data queries scoped
   to `userId`.
9. **MVP scope.** No microservices, no queues, no caching. Admin write endpoints for
   reference data are future scope — do not scaffold them.

---

## 18. Output Expectations

Produce in this order:

1. Complete folder and file tree
2. All config files (`turbo.json`, `pnpm-workspace.yaml`, all `package.json`s,
   `tsconfig.json`s, `mikro-orm.config.ts`)
3. All `packages/schema` Zod schemas in full — including the `FilmJourneyEvent`
   `eventData` discriminated union (9 states), the `Package` format/type union, and
   all reference data response schemas
4. All domain layer files in full — `film-state-machine.ts` with the Map-based transition
   table, `errors.ts`, and all domain types
5. All infrastructure entity files in full — including CTI entities for FilmReceiver,
   `FilmJourneyEvent` with `eventData` JSON column, `FilmHolderSlot`, and all reference
   data entities
6. All repository and mapper files in full
7. Full auth module — JWT strategy, guards, refresh token rotation, controller
8. `modules/reference/` — controller + service for all reference data GET endpoints
9. All remaining NestJS modules / controllers / services in full — including the
   transactional event-creation flow with slot side-effects in `FilmService`
10. Swagger bootstrap in `main.ts` — `nestjs-zod` bridge, UI at `/api/docs`,
    spec at `/api/docs-json`
11. All Vue pages, composables (`useApi`, `useAuth`, `useZodForm`, `useReferenceStore`),
    and router config in full — zero custom CSS
12. Seed script in full — all seven reference tables + demo user
13. All test files in full — including the 10-step full-journey integration test
14. `docs/ARCHITECTURE.md`
