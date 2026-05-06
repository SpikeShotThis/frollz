# Domain Model

## Overview

The system tracks analog film through three distinct levels:

| Level | Entity | Represents |
|---|---|---|
| 1 | **FilmLot** | How film was purchased (a box, a pro-pack, a single roll) |
| 2 | **Film** | A single trackable consumable (one roll or one sheet) |
| 3 | **FilmFrame** | An individual exposure within a roll or sheet |

These three levels sit on top of a shared layer of **reference data** (emulsions, film formats, package types, film states, etc.) and interact with **devices** (cameras, interchangeable backs, film holders).

---

## Level 1 — FilmLot

**Entity:** `FilmLotEntity` — table `film_lot`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
emulsion_id      INTEGER NOT NULL REFERENCES emulsion(id)
package_type_id  INTEGER NOT NULL REFERENCES package_type(id)
film_format_id   INTEGER NOT NULL REFERENCES film_format(id)
quantity         INTEGER NOT NULL          -- number of rolls or sheets in this purchase
expiration_date  TEXT                      -- ISO 8601, nullable
supplier_id      INTEGER                  -- nullable FK to film_supplier(id)
purchase_info    JSON                     -- { channel, price, currencyCode, orderRef, obtainedDate }, nullable
rating           INTEGER                  -- nullable, 1–5
created_at       TEXT NOT NULL             -- ISO 8601
```

A FilmLot represents a single purchase event. Examples:

- A box of 25 Velvia 50 4x5 sheets → `quantity = 25`
- A Portra 400 120 pro-pack (5 rolls) → `quantity = 5`
- A single 35mm 36exp Tri-X roll → `quantity = 1`

### purchase_info JSON

The `purchase_info` column stores purchase metadata as a JSON object:

| Field | Type | Meaning |
|---|---|---|
| `channel` | `string \| null` | How it was bought (e.g. "online", "in-store") |
| `price` | `number \| null` | Total price paid for the entire lot |
| `currencyCode` | `string \| null` | ISO 4217 currency code (e.g. "USD") |
| `orderRef` | `string \| null` | Order reference or receipt number |
| `obtainedDate` | `string \| null` | ISO 8601 date of purchase |

The `price` is the cost for the entire lot. Per-film cost is derived at read time by dividing `price` by `quantity` (see cost allocation below).

### supplier_id

Optional FK to `film_supplier`. Represents where the film was purchased. This is separate from `purchase_info.channel` — the supplier is a tracked entity; the channel is a free-form label.

### Creation rules

When a FilmLot is created via `POST /film/lots`, all Film entries are created atomically in the same transaction:

- **35mm / 120 / Instax**: the caller may supply a `films` array with names for each roll. If `films` is omitted or has fewer entries than `quantity`, names are auto-generated ("Roll 1", "Roll 2", etc.).
- **Large format (4x5, 8x10, etc.)**: Films are auto-named "Sheet 1" through "Sheet N". Users can rename individual sheets after the fact.
- **quantity = 1**: same path as the above; there is no special case for single-film lots.

### Cost allocation

When `purchase_info.price` is set, the per-film cost is computed at read time by `allocateCostForFilm(total, quantity, filmId)`. The result is surfaced as `purchaseCostAllocated` on `FilmSummary` — it is not stored on the film row. Development cost is similarly derived from the `sent_for_dev` event's `cost` field and surfaced as `developmentCost`.

### Invariant

Every Film **always** belongs to a FilmLot. A Film with no lot does not exist. This means all Film creation flows through `POST /film/lots`, and the capacity of a lot is always known.

---

## Level 2 — Film

**Entity:** `FilmEntity` — table `film`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
film_lot_id      INTEGER NOT NULL REFERENCES film_lot(id)
name             TEXT NOT NULL             -- user-assigned label
emulsion_id      INTEGER NOT NULL REFERENCES emulsion(id)
package_type_id  INTEGER NOT NULL REFERENCES package_type(id)
film_format_id   INTEGER NOT NULL REFERENCES film_format(id)
expiration_date  TEXT                      -- ISO 8601, nullable
current_state_id INTEGER NOT NULL REFERENCES film_state(id)
current_device_id INTEGER                 -- nullable FK to film_device(id), denormalised cache
```

A Film represents a single physical consumable: one 35mm roll, one 120 roll, or one large format sheet. It is the primary unit of the state machine.

`name` carries a `UNIQUE(user_id, name)` constraint — two films belonging to the same user cannot share a name.

`current_state_id` is a denormalised cache of the film's current position in the state machine, updated atomically in the same transaction as each `FilmJourneyEvent` insert.

`current_device_id` is a denormalised FK that is set when the film is loaded into a device and cleared when removed. It enables the occupancy check (`findOccupiedFilmForDeviceId`) to be a single indexed lookup rather than a full-table scan.

### State machine

The canonical transition map lives in `packages/schema/src/film.ts` as `filmTransitionMap` and is re-exported from `apps/api/src/domain/film/film-state-machine.ts`. It is the only source of truth for valid transitions — the map must not be duplicated or reimplemented elsewhere.

Valid transitions:

| From | To | Notes |
|---|---|---|
| `purchased` | `stored` | Standard path after purchase |
| `purchased` | `loaded` | Allowed — bought and loaded same day |
| `stored` | `stored` | **Self-transition** — location change (e.g. thaw workflow) |
| `stored` | `loaded` | |
| `loaded` | `exposed` | Shooting complete |
| `exposed` | `removed` | Film physically removed from device |
| `removed` | `stored` | Re-storing a roll or sheet |
| `removed` | `sent_for_dev` | |
| `sent_for_dev` | `developed` | |
| `developed` | `scanned` | |
| `developed` | `archived` | Skip scan path |
| `scanned` | `archived` | |
| `archived` | _(none)_ | Terminal state |

All other transitions — including backward transitions and unlisted skips — are rejected with a `DomainError`. `stored → stored` is the only valid self-transition.

A Film that has been loaded can never be loaded again. The `loaded` journey event serves as an immutable record; the guard is implemented by checking for any prior `loaded` event in the film's journey before allowing the transition.

### FilmJourneyEvent

**Entity:** `FilmJourneyEventEntity` — table `film_journey_event`

Events are **append-only**. Each event carries:

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
film_id          INTEGER NOT NULL REFERENCES film(id)
user_id          INTEGER NOT NULL REFERENCES user(id)
film_state_id    INTEGER NOT NULL REFERENCES film_state(id)
occurred_at      TEXT NOT NULL   -- ISO 8601, user-supplied
recorded_at      TEXT NOT NULL   -- ISO 8601, server-set on insert
notes            TEXT            -- nullable free text
event_data       JSON NOT NULL   -- validated against per-state Zod schema
```

The `event_data` JSON column holds state-specific structured data. Schemas per state (defined in `packages/schema/src/film.ts`):

| State | `event_data` schema | Key fields |
|---|---|---|
| `purchased` | `filmJourneyEventDataPurchasedSchema` | `{}` (empty) |
| `stored` | `filmJourneyEventDataStoredSchema` | `storageLocationId`, `storageLocationCode` |
| `loaded` | `nonLargeFilmLoadTargetSchema` | discriminated union — see Load Targets below |
| `exposed` | `filmJourneyEventDataExposedSchema` | `{}` (empty) |
| `removed` | `filmJourneyEventDataRemovedSchema` | `{}` (empty) |
| `sent_for_dev` | `filmJourneyEventDataSentForDevSchema` | `labId`, `labName?`, `labContact?`, `actualPushPull`, `cost?` |
| `developed` | `filmJourneyEventDataDevelopedSchema` | `labId`, `labName?`, `actualPushPull` |
| `scanned` | `filmJourneyEventDataScannedSchema` | `scannerOrSoftware`, `scanLink` |
| `archived` | `filmJourneyEventDataArchivedSchema` | `{}` (empty) |

### Load Targets (discriminated union)

The `loaded` event's `event_data` is a discriminated union on `loadTargetType`. There are two families:

**Film-level load** (`nonLargeFilmLoadTargetSchema`) — used when loading a 35mm/120/Instax roll into a device:

| `loadTargetType` | Additional fields | Notes |
|---|---|---|
| `camera_direct` | `cameraId`, `intendedPushPull` | Film loaded directly into camera body |
| `interchangeable_back` | `interchangeableBackId`, `intendedPushPull` | Film loaded into a removable back |
| `film_holder_slot` | `filmHolderId`, `slotNumber (1\|2)`, `intendedPushPull` | Film loaded into a holder slot |

**Frame-level load** (`frameLoadTargetSchema`) — used when recording per-frame load metadata for large format sheets:

| `loadTargetType` | Additional fields | Notes |
|---|---|---|
| `camera_direct` | `filmFrameId`, `cameraId`, `intendedPushPull` | Sheet loaded directly into camera back |
| `interchangeable_back` | `filmFrameId`, `interchangeableBackId`, `intendedPushPull` | Sheet loaded into interchangeable back |
| `film_holder_slot` | `filmFrameId`, `filmHolderId`, `slotNumber (1\|2)`, `intendedPushPull` | Sheet loaded into holder slot |

`intendedPushPull` is an integer representing stops of push/pull (e.g. `+2`, `-1`, `0`), nullable when no push/pull is planned.

---

## Level 3 — FilmFrame

**Entity:** `FilmFrameEntity` — table `film_frame`

```
id                    INTEGER PRIMARY KEY AUTOINCREMENT
user_id               INTEGER NOT NULL REFERENCES user(id)
film_id               INTEGER NOT NULL REFERENCES film(id)
frame_number          INTEGER NOT NULL          -- 1-based
current_state_id      INTEGER NOT NULL REFERENCES film_state(id)
aperture              REAL                      -- nullable; f-stop value (e.g. 5.6)
shutter_speed_seconds REAL                      -- nullable; exposure time in seconds (e.g. 0.004 = 1/250s)
filter_used           BOOLEAN                   -- nullable; whether a filter was used
```

A FilmFrame represents one individual exposure slot within a Film.

### Per-frame exposure metadata

Each frame can record the aperture, shutter speed, and filter use at the time of exposure. These fields are nullable — they may be filled in before or after exposure but are never required. The web app surfaces these as `f/5.6`, formatted shutter speeds (e.g. `1/250`), and a Yes/No/unknown indicator.

`aperture` stores the raw f-number (e.g. `5.6`). Valid values are drawn from `APERTURE_PRESETS` in `packages/schema/src/film.ts`, which covers full, half, and third stops from f/1 to f/64.

`shutter_speed_seconds` stores the raw time in seconds (e.g. `0.004` for 1/250s). Maximum is 14400 seconds (4 hours), supporting bulb/long exposures.

### Creation

- **35mm / 120 / Instax**: frames are created lazily when the Film is first loaded into a device. Frame count is resolved by `resolveNonLargeFrameCount` in `packages/schema/src/film-format-definition.ts`, which multiplies the stock variant's base frame count by the frame size multiplier (e.g. a 120 roll in a 6×7 camera yields 10 frames; in a 6×6 camera, 12 frames; a half-frame 35mm 36exp roll yields 72 frames). This information is only available at load time.
- **Large format (4x5, 8x10, etc.)**: one frame is created per Film entry at lot-creation time (along with the Film itself). A 4x5 sheet has exactly one frame.

### FrameJourneyEvent

**Entity:** `FrameJourneyEventEntity` — table `frame_journey_event`

Frame-level events are append-only and follow the same shape as film-level events, but are scoped to an individual frame:

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
film_id          INTEGER NOT NULL REFERENCES film(id)
film_frame_id    INTEGER NOT NULL REFERENCES film_frame(id)
user_id          INTEGER NOT NULL REFERENCES user(id)
film_state_id    INTEGER NOT NULL REFERENCES film_state(id)
occurred_at      TEXT NOT NULL
recorded_at      TEXT NOT NULL
notes            TEXT
event_data       JSON NOT NULL
```

The `frameJourneyEventPayloadSchema` mirrors the film-level payload schema but uses `frameStateCode` as its discriminator. Frame-level events are currently appended as part of bulk film-level transitions (all frames in a roll advance together when the roll advances). The frame-level event system is designed to support future per-exposure data entry workflows.

---

## Devices

**Entity hierarchy:** `FilmDeviceEntity` (base) with three subtype entities: `CameraEntity`, `InterchangeableBackEntity`, `FilmHolderEntity`.

This is a **Class Table Inheritance (CTI)** structure. The base table holds shared fields; each subtype table holds its own columns, linked back to the base by a shared PK (`film_device_id → film_device.id`).

### Base — FilmDevice

**Entity:** `FilmDeviceEntity` — table `film_device`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
device_type_id   INTEGER NOT NULL REFERENCES device_type(id)
film_format_id   INTEGER NOT NULL REFERENCES film_format(id)
frame_size       TEXT                      -- nullable; FrameSizeCode (e.g. '6x7', 'full_frame')
```

`frame_size` stores which gate/mask the device uses, which determines frame count for 35mm/120 rolls. Cameras that use interchangeable backs or film holders leave this null, because the frame size is determined by the back or holder at load time.

### Subtype — Camera

**Entity:** `CameraEntity` — table `camera`

```
film_device_id   INTEGER PRIMARY KEY REFERENCES film_device(id)
make             TEXT NOT NULL
model            TEXT NOT NULL
load_mode        TEXT NOT NULL             -- 'direct' | 'interchangeable_back' | 'film_holder'
can_unload       BOOLEAN NOT NULL
camera_system    TEXT                      -- nullable; e.g. 'Hasselblad V', 'Mamiya 645'
serial_number    TEXT                      -- nullable
date_acquired    TEXT                      -- nullable; ISO 8601
```

`load_mode` controls which load target types are valid when loading film into this camera:

| `load_mode` | Valid load target |
|---|---|
| `direct` | `camera_direct` |
| `interchangeable_back` | `interchangeable_back` |
| `film_holder` | `film_holder_slot` |

`can_unload` controls whether the film can be removed from this camera without exposing it. Some cameras (e.g. disposables) cannot unload.

### Subtype — InterchangeableBack

**Entity:** `InterchangeableBackEntity` — table `interchangeable_back`

```
film_device_id   INTEGER PRIMARY KEY REFERENCES film_device(id)
name             TEXT NOT NULL
system           TEXT NOT NULL             -- e.g. 'Hasselblad V', 'Mamiya RZ67'
```

An interchangeable back is a film-holding module that attaches to a camera body. The `system` field identifies the camera system it is compatible with.

### Subtype — FilmHolder

**Entity:** `FilmHolderEntity` — table `film_holder`

```
film_device_id   INTEGER PRIMARY KEY REFERENCES film_device(id)
name             TEXT NOT NULL
brand            TEXT NOT NULL
slot_count       INTEGER NOT NULL          -- 1 or 2
holder_type_id   INTEGER NOT NULL REFERENCES holder_type(id)
```

A film holder is a light-tight container for large format sheets. `slot_count` is always 1 or 2 (most holders have 2 sides). `holder_type` classifies the holder: `standard`, `grafmatic`, `readyload`, `quickload`.

### FilmHolderSlot

**Entity:** `FilmHolderSlotEntity` — table `film_holder_slot`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
film_device_id   INTEGER NOT NULL REFERENCES film_holder(film_device_id)
side_number      INTEGER NOT NULL          -- 1 or 2
slot_state_id    INTEGER NOT NULL REFERENCES slot_state(id)
slot_state_code  TEXT NOT NULL             -- denormalised for query efficiency
loaded_film_id   INTEGER                  -- nullable FK to film(id)
created_at       TEXT NOT NULL             -- ISO 8601
```

A new slot record is created each time a film is loaded into a slot (rather than updating the previous record). This preserves load cycle history. A slot is considered available when no record exists for `(film_device_id, side_number)` or when the most recent such record has `slot_state_code = 'removed'`.

### Occupancy model

A Film in `loaded` or `exposed` state occupies its device. Two Films cannot occupy the same device simultaneously.

- **Camera / InterchangeableBack**: one Film at a time.
- **FilmHolder**: one Film per slot (tracked by `film_holder_slot`).

The `film.current_device_id` denormalised FK makes the occupancy check a single indexed query. It is set atomically when a `loaded` event is processed and cleared when a `removed` event is processed.

### DeviceMount

**Entity:** `DeviceMountEntity` — table `device_mount`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
camera_device_id INTEGER NOT NULL REFERENCES film_device(id)
mounted_device_id INTEGER NOT NULL REFERENCES film_device(id)
mounted_at       TEXT NOT NULL             -- ISO 8601
unmounted_at     TEXT                      -- nullable; ISO 8601
```

A DeviceMount records when an interchangeable back or film holder is physically attached to a camera body. This is tracked separately from film occupancy — a back can be mounted to a camera without having film loaded. `unmounted_at` is null while the device is still attached.

---

## Supporting Entities

### FilmLab

**Entity:** `FilmLabEntity` — table `film_lab`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
name             TEXT NOT NULL
normalized_name  TEXT NOT NULL             -- lowercase normalized for deduplication
contact          TEXT                      -- nullable; contact person name
email            TEXT                      -- nullable
website          TEXT                      -- nullable
default_processes TEXT                     -- nullable; JSON-serialized list of process codes
notes            TEXT                      -- nullable
active           BOOLEAN NOT NULL DEFAULT TRUE
rating           INTEGER                   -- nullable; 1–5
```

`UNIQUE(user_id, normalized_name)` prevents duplicate labs per user. The `normalized_name` is derived from `name` at write time. `active` can be set to false to soft-delete a lab without losing historical associations. Labs are referenced in `sent_for_dev` and `developed` event data.

### FilmSupplier

**Entity:** `FilmSupplierEntity` — table `film_supplier`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
name             TEXT NOT NULL
normalized_name  TEXT NOT NULL             -- lowercase normalized for deduplication
contact          TEXT                      -- nullable
email            TEXT                      -- nullable
website          TEXT                      -- nullable
notes            TEXT                      -- nullable
active           BOOLEAN NOT NULL DEFAULT TRUE
rating           INTEGER                   -- nullable; 1–5
```

`UNIQUE(user_id, normalized_name)` prevents duplicate suppliers per user. Suppliers are referenced on FilmLot via `supplier_id`.

### User

**Entity:** `UserEntity` — table `user`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
email            TEXT NOT NULL UNIQUE
name             TEXT NOT NULL
password_hash    TEXT NOT NULL
created_at       TEXT NOT NULL
```

Every user-owned entity carries a `user_id` FK, and all repository queries on those tables are scoped by `userId`. Cross-user lookups return `404` to avoid leaking existence.

### RefreshToken

**Entity:** `RefreshTokenEntity` — table `refresh_tokens`

Stores hashed refresh tokens for JWT rotation. `previous_token_hash` and `previous_token_grace_until` support a grace window for in-flight concurrent requests during rotation. `revoked_at` marks explicitly revoked tokens.

### IdempotencyKey

**Entity:** `IdempotencyKeyEntity` — table `idempotency_key`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
scope            TEXT NOT NULL             -- e.g. 'film_event', 'film_lot'
key              TEXT NOT NULL             -- client-supplied UUID
request_hash     TEXT NOT NULL             -- SHA-256 of the request body
response_body    JSON NOT NULL             -- stored response for replay
created_at       TEXT NOT NULL
expires_at       TEXT                      -- nullable; TTL-based expiry
UNIQUE(user_id, scope, key)
```

All mutating endpoints require an `Idempotency-Key` header. The key is stored alongside a hash of the request body. Replaying the same key with the same body returns the cached response without creating a duplicate row. Replaying with a different body returns `409 CONFLICT`.

---

## Reference Data

Reference data is seeded once at startup, shared across all users, and read-only in the current version. All reference tables share a base shape:

```
id    INTEGER PRIMARY KEY AUTOINCREMENT
code  TEXT NOT NULL UNIQUE   -- machine identifier
label TEXT NOT NULL          -- human-readable label
```

| Entity | Table | Key codes |
|---|---|---|
| `FilmFormatEntity` | `film_format` | `35mm`, `120`, `4x5`, `5x7`, `8x10`, `11x14`, `2x3`, `InstaxMini`, `InstaxWide`, `InstaxSquare` |
| `DevelopmentProcessEntity` | `development_process` | `C41`, `E6`, `ECN2`, `BW` |
| `PackageTypeEntity` | `package_type` | `24exp`, `36exp`, `100ft_bulk`, `400ft_bulk` (35mm); `120_roll`, `220_roll` (medium); `10sheets`, `25sheets`, `50sheets` (large format); `pack` (Instax) |
| `FilmStateEntity` | `film_state` | `purchased`, `stored`, `loaded`, `exposed`, `removed`, `sent_for_dev`, `developed`, `scanned`, `archived` |
| `StorageLocationEntity` | `storage_location` | `freezer`, `refrigerator`, `shelf`, `other` |
| `SlotStateEntity` | `slot_state` | `empty`, `loaded`, `exposed`, `removed` |
| `DeviceTypeEntity` | `device_type` | `camera`, `interchangeable_back`, `film_holder` |
| `HolderTypeEntity` | `holder_type` | `standard`, `grafmatic`, `readyload`, `quickload` |
| `EmulsionEntity` | `emulsion` | Kodak Gold/Portra/Ektar/Tri-X, Ilford HP5/Delta, Fujifilm Velvia/Provia, CineStill 800T, etc. |

`PackageTypeEntity` has an additional `film_format_id` FK — each package type belongs to exactly one film format. The `film.package_type_id → package_type.id` FK enforces valid format/type combinations at the database level.

`EmulsionEntity` links to `DevelopmentProcessEntity` and has a many-to-many relationship with `FilmFormatEntity` via the `emulsion_film_format` pivot table, representing which formats a given emulsion is available in.

---

## Film Format Definition System

`packages/schema/src/film-format-definition.ts` is the source of truth for all format-specific business logic. It is **not** a database table — it is a static catalog consumed by both API and web clients at runtime.

Each entry in `filmFormatDefinitions` describes:

| Field | Purpose |
|---|---|
| `filmType` | Film family: `135` (35mm), `120` (medium), `sheet`, `instax` |
| `frameSizes` | Valid gate/mask options, each with `framesPerUnit` and `frameSizeMultiplier` |
| `stockVariants` | Valid package types, each with `unitsPerVariant`, `framesPerUnit`, `variantMultiplier`, `supportsDirectLoad` |

Frame count at load time is resolved by `resolveNonLargeFrameCount(formatCode, packageTypeCode, frameSize)`, which multiplies the relevant factors together. Bulk spools (`100ft_bulk`, `400ft_bulk`) have `supportsDirectLoad: false` and cannot be loaded until converted to rolls.

---

## ID and Date Strategy

**IDs**: all tables use `INTEGER PRIMARY KEY AUTOINCREMENT`. IDs are exposed as `number` in TypeScript and JSON. No UUIDs are used in runtime contracts.

**Dates**: all date/time values crossing an API boundary are ISO 8601 strings validated by `isoDateTimeSchema`. The database stores them as `TEXT`. `Date` objects appear only inside MikroORM entity internals where the ORM requires them; mappers convert immediately.

---

## Constraints and Rules Summary

| Rule | Enforced by |
|---|---|
| Film name unique per user | `UNIQUE(user_id, name)` on `film` + `DomainError('CONFLICT')` on violation |
| Film format must match package type format | Service layer on create |
| Film can only be loaded once | Service layer: checks for any prior `loaded` FilmJourneyEvent before allowing transition |
| Cannot load more films than lot quantity | Implicit: all Films are created at lot-creation time; no additional Films can be added to a lot |
| Cannot load film into occupied device | Service layer: `findOccupiedFilmForDeviceId` check before slot/device assignment |
| Cannot delete a film that is loaded or exposed | Service layer: state check before delete |
| Cannot delete a device with a loaded or exposed film | Service layer: occupancy check before delete |
| POST /film is deprecated | Use `POST /film/lots` instead; direct film creation bypasses lot invariants |
| Idempotency on mutating endpoints | `Idempotency-Key` header + SHA-256 request hash stored in `idempotency_key` table with TTL |
| Lab/supplier names unique per user | `UNIQUE(user_id, normalized_name)` on `film_lab` and `film_supplier` |
