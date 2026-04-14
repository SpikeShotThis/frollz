# API Reference

The Frollz REST API is available at `/api`. Interactive Swagger documentation is available at `/api/docs` when the application is running.

All requests and responses use JSON. All IDs are integers. Validation errors return HTTP 400.

---

## Formats

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/formats` | List all formats |
| `GET` | `/api/formats/:id` | Get a format by id |
| `POST` | `/api/formats` | Create a format |
| `PATCH` | `/api/formats/:id` | Update a format |
| `DELETE` | `/api/formats/:id` | Delete a format |

Formats cannot be deleted while emulsions reference them (returns 409 Conflict).

---

## Emulsions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/emulsions` | List all emulsions |
| `GET` | `/api/emulsions/brands?q=` | Distinct brand names (typeahead) |
| `GET` | `/api/emulsions/manufacturers?q=` | Distinct manufacturer names (typeahead) |
| `GET` | `/api/emulsions/speeds?q=` | Distinct ISO speeds (typeahead) |
| `GET` | `/api/emulsions/:id` | Get an emulsion by id |
| `POST` | `/api/emulsions` | Create an emulsion |
| `POST` | `/api/emulsions/bulk` | Create one emulsion per format from a single set of properties |
| `PATCH` | `/api/emulsions/:id` | Update an emulsion |
| `DELETE` | `/api/emulsions/:id` | Delete an emulsion |
| `POST` | `/api/emulsions/:id/tags` | Associate a tag with an emulsion |
| `DELETE` | `/api/emulsions/:id/tags/:tagId` | Remove a tag from an emulsion |
| `PUT` | `/api/emulsions/:id/box-image` | Upload or replace the box art image (multipart/form-data, field `file`, max 4 MB) |
| `GET` | `/api/emulsions/:id/box-image` | Serve the box art image |

Emulsions cannot be deleted while films reference them (returns 409 Conflict).

---

## Films

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/films` | List all films with optional filters |
| `GET` | `/api/films/:id` | Get a film by id |
| `GET` | `/api/films/:id/children` | List child films cut from a bulk canister |
| `POST` | `/api/films` | Create a film |
| `PATCH` | `/api/films/:id` | Update a film |
| `DELETE` | `/api/films/:id` | Delete a film |
| `POST` | `/api/films/:id/tags` | Associate a tag with a film |
| `DELETE` | `/api/films/:id/tags/:tagId` | Remove a tag from a film |
| `POST` | `/api/films/:id/transition` | Transition a film to a new state |

### List filters (`GET /api/films`)

| Query param | Type | Description |
|---|---|---|
| `state` | string (repeatable) | Filter by current state name(s) — OR semantics |
| `emulsionId` | number | Filter by emulsion |
| `formatId` | number | Filter by format (via emulsion) |
| `tagId` | number (repeatable) | Filter by tag(s) — OR semantics |
| `from` | YYYY-MM-DD | Loaded date range start (inclusive) |
| `to` | YYYY-MM-DD | Loaded date range end (inclusive) |
| `q` | string | Case-insensitive partial match on film name or state note |

### Create film (`POST /api/films`)

```json
{
  "name": "Roll 001",
  "emulsionId": 1,
  "expirationDate": "2027-06-01",
  "transitionProfileId": 1,
  "parentId": null,
  "metadata": {
    "dateObtained": "2026-01-15",
    "obtainmentMethod": "Purchase",
    "obtainedFrom": "B&H Photo"
  }
}
```

`metadata` is optional. `dateObtained`, `obtainmentMethod`, and `obtainedFrom` are captured as metadata on the initial Added state.

### Transition a film (`POST /api/films/:id/transition`)

```json
{
  "targetStateName": "Loaded",
  "date": "2026-04-14T10:30:00.000Z",
  "note": "Optional free-text note",
  "metadata": {
    "shotISO": "400"
  }
}
```

`date` defaults to now. `note` and `metadata` are optional. See transition metadata fields below.

### Film lifecycle

Film rolls move through a defined set of states. The allowed transitions depend on the film's `transitionProfile`.

#### Standard profile (C-41, E-6, B&W)

| From | Forward to | Backward to |
|---|---|---|
| Added | Frozen, Refrigerated, Shelved | — |
| Frozen | Refrigerated, Shelved | Added |
| Refrigerated | Shelved | Frozen, Added |
| Shelved | Loaded | Refrigerated, Frozen |
| Loaded | Finished | Shelved, Refrigerated, Frozen |
| Finished | Sent For Development | Loaded |
| Sent For Development | Developed | Finished |
| Developed | Received | Sent For Development |
| Received | — | Developed |

#### Instant profile (Instax, Polaroid)

Same as standard through Finished, then:

| From | Forward to | Backward to |
|---|---|---|
| Finished | Received | Loaded |
| Received | — | Finished |

No Sent For Development or Developed states.

#### Bulk profile

Storage and loading only (Added → storage states → Loaded → Finished). No post-shoot chain.

### Transition metadata fields by state

| State | Field | Type | Notes |
|---|---|---|---|
| Added | `dateObtained` | date | When the film was acquired |
| Added | `obtainmentMethod` | string | e.g. Purchase, Gift |
| Added | `obtainedFrom` | string | e.g. store name |
| Frozen / Refrigerated | `temperature` | number | Storage temperature |
| Finished | `shotISO` | number | ISO used while shooting |
| Sent For Development | `labName` | string | |
| Sent For Development | `deliveryMethod` | string | e.g. Mail in, Drop off |
| Sent For Development | `processRequested` | string | e.g. C-41, Push 1 |
| Sent For Development | `pushPullStops` | number | |
| Received | `scansReceived` | boolean | |
| Received | `scansUrl` | string (multiple) | One URL per value |
| Received | `negativesReceived` | boolean | |
| Received | `negativesDate` | date | |

---

## Film States

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/film-states?filmId=:id` | Get the full state history for a film |

`filmId` is required.

---

## Film Stats

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/film-stats/by-state` | Film count grouped by current state |
| `GET` | `/api/film-stats/by-month?months=12` | Film count grouped by month of first state (default 12 months) |
| `GET` | `/api/film-stats/by-emulsion` | Film count grouped by emulsion |
| `GET` | `/api/film-stats/lifecycle-durations` | Average days between consecutive state transitions |

---

## Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tags` | List all tags |
| `GET` | `/api/tags/:id` | Get a tag by id |
| `POST` | `/api/tags` | Create a tag |
| `PATCH` | `/api/tags/:id` | Update a tag |
| `DELETE` | `/api/tags/:id` | Delete a tag |

Tags with dependents (films or emulsions using them) cannot be deleted (returns 409 Conflict).

---

## Cameras

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cameras` | List cameras with optional filters |
| `GET` | `/api/cameras/:id` | Get a camera by id |
| `POST` | `/api/cameras` | Create a camera |
| `PATCH` | `/api/cameras/:id` | Update a camera |
| `DELETE` | `/api/cameras/:id` | Delete a camera |

### List filters (`GET /api/cameras`)

| Query param | Type | Description |
|---|---|---|
| `brand` | string | Filter by brand |
| `model` | string | Filter by model |
| `status` | string | `active`, `retired`, or `in_repair` |
| `formatId` | number | Filter by accepted format |
| `unloaded` | boolean | Only cameras not currently loaded |

Camera status values: `active`, `retired`, `in_repair`.

---

## Transitions (state machine configuration)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/transitions/profiles` | List all transition profiles |
| `GET` | `/api/transitions?profile=standard` | Get the full state machine graph for a profile |

---

## Reference data (read-only)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/packages` | List all package types (Roll, Sheet, Instant, …) |
| `GET` | `/api/processes` | List all development processes (C-41, E-6, B&W, Instant) |

---

## Export / Import

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/export/films.json` | Export all films with full state history as JSON |
| `GET` | `/api/export/library.json` | Export reference data (emulsions, formats, tags) as JSON |
| `GET` | `/api/import/films/template` | Download the CSV template for film import |
| `POST` | `/api/import/films` | Import films from a CSV file (multipart, field `csv`) |
| `POST` | `/api/import/library` | Import reference data from a `library.json` export (multipart, field `library`) |
| `POST` | `/api/import/films/json` | Import films with full state history from a `films.json` export (multipart, field `films`) |
