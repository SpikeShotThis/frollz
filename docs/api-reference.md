# API Reference

The Frollz REST API is available at `/api`. Interactive Swagger documentation is available at `/api/docs` when the application is running.

All requests and responses use JSON. Validation errors return HTTP 422 with a body describing the failed constraints.

## Film Formats

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/film-formats` | List all formats |
| `POST` | `/api/film-formats` | Create a new format |
| `GET` | `/api/film-formats/:key` | Get a specific format |
| `PATCH` | `/api/film-formats/:key` | Update a format |
| `DELETE` | `/api/film-formats/:key` | Delete a format |

Formats cannot be deleted while stocks reference them (returns 409 Conflict).

## Stocks

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stocks` | List all stocks |
| `POST` | `/api/stocks` | Create a new stock |
| `GET` | `/api/stocks/:key` | Get a specific stock |
| `PATCH` | `/api/stocks/:key` | Update a stock |
| `DELETE` | `/api/stocks/:key` | Delete a stock |
| `GET` | `/api/stocks/typeahead/brands` | Brand suggestions for typeahead |
| `GET` | `/api/stocks/typeahead/manufacturers` | Manufacturer suggestions for typeahead |
| `GET` | `/api/stocks/typeahead/speeds` | Speed suggestions for typeahead |

Stocks cannot be deleted while rolls reference them (returns 409 Conflict).

## Rolls

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/rolls` | List all rolls |
| `POST` | `/api/rolls` | Create a new roll |
| `GET` | `/api/rolls/:key` | Get a specific roll |
| `PATCH` | `/api/rolls/:key` | Update a roll |
| `DELETE` | `/api/rolls/:key` | Delete a roll |
| `POST` | `/api/rolls/:key/transition` | Transition a roll to a new state |

### Roll Lifecycle

Film rolls move through a defined set of states. Forward transitions advance the roll; backward transitions are allowed for corrections and are flagged in the roll's history.

| From State | Forward To | Backward To |
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

### Transition Metadata

Certain transitions capture structured metadata:

| Transition | Fields |
|---|---|
| → Frozen / Refrigerated / Shelved | `temperature` (number, optional) |
| → Finished | `shotISO` (number, optional) |
| → Sent For Development | `labName`, `deliveryMethod`, `processRequested` (strings), `pushPullStops` (number) |
| → Received | `scansReceived` (boolean), `scansUrl` (string), `negativesReceived` (boolean), `negativesDate` (date) |

## Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/tags` | Create a new tag |
| `GET` | `/api/tags/:key` | Get a specific tag |
| `PATCH` | `/api/tags/:key` | Update a tag |
| `DELETE` | `/api/tags/:key` | Delete a tag |

System tags (`expired`, `pushed`, `pulled`, `cross-processed`) cannot be deleted (returns 403 Forbidden). Tags with dependents cannot be deleted (returns 409 Conflict).

## Stock Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stock-tags` | List stock–tag assignments |
| `POST` | `/api/stock-tags` | Assign a tag to a stock |
| `GET` | `/api/stock-tags/:key` | Get a specific assignment |
| `DELETE` | `/api/stock-tags/:key` | Remove a tag from a stock |

## Roll Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/roll-tags` | List roll–tag assignments (filterable by `?rollKey=` or `?tagKey=`) |
| `POST` | `/api/roll-tags` | Assign a tag to a roll |
| `DELETE` | `/api/roll-tags/:key` | Remove a tag from a roll |

## Roll States

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/roll-states` | List all state history entries |
| `GET` | `/api/roll-states/:key` | Get a specific state entry |

## Transition Configuration (DB-driven state machine)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/transition-states` | List all valid roll states |
| `GET` | `/api/transitions` | List all valid transitions |
| `GET` | `/api/transitions/:key` | Get a transition with its metadata fields |
| `GET` | `/api/transition-metadata` | List metadata field definitions |
