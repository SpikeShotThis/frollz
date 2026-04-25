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

**Table:** `film_lot`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
emulsion_id      INTEGER NOT NULL REFERENCES emulsion(id)
package_type_id  INTEGER NOT NULL REFERENCES package_type(id)
film_format_id   INTEGER NOT NULL REFERENCES film_format(id)
quantity         INTEGER NOT NULL          -- number of rolls or sheets in this purchase
expiration_date  TEXT                      -- ISO 8601, nullable
created_at       TEXT NOT NULL             -- ISO 8601
```

A FilmLot represents a single purchase event. Examples:

- A box of 25 Velvia 50 4x5 sheets → `quantity = 25`
- A Portra 400 120 pro-pack (5 rolls) → `quantity = 5`
- A single 35mm 36exp Tri-X roll → `quantity = 1`

### Creation rules

When a FilmLot is created, all Film entries are created atomically in the same transaction:

- **35mm / 120**: the caller supplies a name for each roll (matching the physical label the user applies to the roll). The `films` array must have exactly `quantity` entries.
- **Large format (4x5, 8x10, etc.)**: Films are auto-named "Sheet 1" through "Sheet N". Users can rename individual sheets after the fact (e.g., "Sunset at the Pier 4/25/2026" after it has been shot).
- **quantity = 1**: same path as above; the single-film case is not special-cased anywhere.

### Invariant

Every Film **always** belongs to a FilmLot. A Film with no lot does not exist. This means all Film creation flows through `POST /film-lots`, and the capacity of a lot is always known.

---

## Level 2 — Film

**Table:** `film`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
film_lot_id      INTEGER NOT NULL REFERENCES film_lot(id)
name             TEXT NOT NULL             -- user-assigned label, unique per user
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

Valid transitions:

| From | To | Notes |
|---|---|---|
| `purchased` | `stored` | Standard path |
| `purchased` | `loaded` | Skip allowed — bought and loaded same day |
| `stored` | `stored` | **Self-transition** — location change (e.g. thaw workflow) |
| `stored` | `loaded` | |
| `loaded` | `exposed` | Shooting complete |
| `exposed` | `removed` | Film physically removed from device |
| `removed` | `stored` | Re-storing a roll or sheet |
| `removed` | `sent_for_dev` | |
| `sent_for_dev` | `developed` | |
| `developed` | `scanned` | |
| `developed` | `archived` | Skip scan |
| `scanned` | `archived` | |

All other transitions — including backwards transitions and unlisted skips — are rejected with a `DomainError`. `stored → stored` is the only valid self-transition.

A Film that has been loaded can never be loaded again. The `loaded` journey event serves as an immutable record; the guard is implemented by checking for any prior `loaded` event in the film's journey before allowing the transition.

### FilmJourneyEvent

Events are **append-only**. Each event carries:

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
film_id          INTEGER NOT NULL REFERENCES film(id)
user_id          INTEGER NOT NULL REFERENCES user(id)
film_state_id    INTEGER NOT NULL REFERENCES film_state(id)
occurred_at      TEXT NOT NULL   -- ISO 8601, user-supplied
recorded_at      TEXT NOT NULL   -- ISO 8601, server-set on insert
notes            TEXT            -- nullable free text
event_data       TEXT NOT NULL   -- JSON, validated against per-state Zod schema
```

The `event_data` JSON column holds state-specific structured data. Schemas per state:

| State | `event_data` fields |
|---|---|
| `purchased` | `{}` |
| `stored` | `{ storageLocationId, storageLocationCode }` |
| `loaded` | `{ loadTargetType, [cameraId \| interchangeableBackId \| filmHolderId], slotNumber?, intendedPushPull? }` |
| `exposed` | `{}` |
| `removed` | `{}` |
| `sent_for_dev` | `{ labName?, labContact?, actualPushPull? }` |
| `developed` | `{ labName?, actualPushPull? }` |
| `scanned` | `{ scannerOrSoftware?, scanLink? }` |
| `archived` | `{}` |

---

## Level 3 — FilmFrame

**Table:** `film_frame`

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
film_id          INTEGER NOT NULL REFERENCES film(id)
frame_number     INTEGER NOT NULL          -- 1-based
current_state_id INTEGER NOT NULL REFERENCES film_state(id)
```

A FilmFrame represents one individual exposure slot within a Film.

### Creation

- **35mm / 120**: frames are created lazily at the moment the Film is first loaded into a device. Frame count depends on the camera's `frameSize` (a 120 roll in a 6×7 camera yields 10 frames; in a 6×6 camera, 12 frames). This information is only available at load time.
- **Large format**: one frame is created per Film entry at lot-creation time (along with the Film itself). A 4x5 sheet has exactly one frame.

### Purpose

FilmFrames are the foundation for future per-exposure metadata (aperture, shutter speed, focal length, notes, etc.). `currentState` tracks the frame through its own lifecycle, mirroring the parent Film's state for bulk transitions (all frames in a roll advance together when the roll advances).

There is no concept of "loading" an individual 35mm frame into a device — that happens at the Film (roll) level. The frame-level event system (`FrameJourneyEvent`) is reserved for future per-exposure data entry.

---

## Devices

**Table:** `film_device` (base) with subtype tables `camera`, `interchangeable_back`, `film_holder`

This is a Class Table Inheritance (CTI) structure. The base table holds shared fields (`user_id`, `device_type_id`, `film_format_id`, `frame_size`). Each subtype table holds its own columns, keyed on `film_receiver_id → film_device.id`.

### Occupancy model

A Film in `loaded` or `exposed` state occupies its device. Two Films cannot occupy the same device simultaneously.

- **Camera / InterchangeableBack**: one Film at a time.
- **FilmHolder**: one Film per slot (slots tracked in `film_holder_slot`).

The `film.current_device_id` denormalised FK makes the occupancy check a single indexed query. It is set atomically when a `loaded` event is processed and cleared when a `removed` event is processed.

### FilmHolderSlot

```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES user(id)
film_holder_id   INTEGER NOT NULL REFERENCES film_holder(film_receiver_id)
side_number      INTEGER NOT NULL     -- 1 or 2
slot_state_id    INTEGER NOT NULL REFERENCES slot_state(id)
slot_state_code  TEXT NOT NULL        -- denormalised for query efficiency
loaded_film_id   INTEGER              -- nullable FK to film(id)
created_at       TEXT NOT NULL
```

A new slot record is created each time a film is loaded into a slot (rather than updating the previous record). This preserves load cycle history. A slot is considered available when no record exists for `(film_holder_id, side_number)` or when the most recent such record has `slot_state_code = 'removed'`.

---

## Reference Data

Reference data is seeded once, shared across all users, and read-only in the current version. All reference tables share a base shape:

```
id    INTEGER PRIMARY KEY AUTOINCREMENT
code  TEXT NOT NULL UNIQUE   -- machine identifier
label TEXT NOT NULL          -- human-readable label
```

| Table | Key values |
|---|---|
| `film_format` | `35mm`, `120`, `220`, `4x5`, `2x3`, `8x10`, `InstaxMini`, `InstaxWide`, `InstaxSquare` |
| `development_process` | `C41`, `E6`, `ECN2`, `BW` |
| `package_type` | `24exp`, `36exp`, `100ft_bulk` (35mm); `roll` (120/220); `10sheets`, `25sheets`, `50sheets` (large format); `pack` (Instax) |
| `film_state` | `purchased`, `stored`, `loaded`, `exposed`, `removed`, `sent_for_dev`, `developed`, `scanned`, `archived` |
| `storage_location` | `freezer`, `refrigerator`, `shelf`, `other` |
| `slot_state` | `empty`, `loaded`, `exposed`, `removed` |
| `device_type` | `camera`, `interchangeable_back`, `film_holder` |
| `holder_type` | `standard`, `grafmatic`, `readyload`, `quickload` |
| `emulsion` | Kodak Gold/Portra/Ektar/Tri-X, Ilford HP5/Delta, Fujifilm Velvia/Provia, CineStill 800T, etc. |

`package_type` has an additional `film_format_id` FK — each package type belongs to exactly one film format. The `film.package_type_id → package_type.id` FK enforces valid format/type combinations at the database level.

---

## ID and date strategy

**IDs**: all tables use `INTEGER PRIMARY KEY AUTOINCREMENT`. IDs are exposed as `number` in TypeScript and JSON. No UUIDs.

**Dates**: all date/time values crossing an API boundary are ISO 8601 strings. The database stores them as `TEXT`. `Date` objects appear only inside MikroORM entity internals where the ORM requires them; mappers convert immediately.

---

## Constraints and rules summary

| Rule | Enforced by |
|---|---|
| Film name unique per user | `UNIQUE(user_id, name)` on `film` + `DomainError('CONFLICT')` on violation |
| Film format must match package type format | Service layer on create |
| Film can only be loaded once | Service layer: checks for prior `loaded` FilmJourneyEvent before allowing transition |
| Cannot load more films than lot quantity | Implicit: all Films are created at lot creation time; no additional Films can be added to a lot |
| Cannot load film into occupied device | Service layer: `findOccupiedFilmForDeviceId` check before slot/device assignment |
| Cannot delete a film that is loaded or exposed | Service layer: state check before delete |
| Cannot delete a device with a loaded or exposed film | Service layer: occupancy check before delete |
| Idempotency on mutating endpoints | `Idempotency-Key` header + SHA-256 request hash stored in `idempotency_key` table with 24h TTL |
