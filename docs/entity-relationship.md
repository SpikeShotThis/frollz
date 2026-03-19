# Entity Relationship Diagram

The Frollz data model is organized around film rolls moving through a lifecycle. Rolls reference stocks, stocks reference film formats, and both can be tagged. The state machine that governs roll lifecycle transitions is defined entirely in the database.

```mermaid
erDiagram
    film_formats {
        text id PK
        text form_factor
        text format
        timestamp created_at
        timestamp updated_at
    }

    stocks {
        text id PK
        text format_key FK
        text base_stock_key FK
        text process
        text manufacturer
        text brand
        integer speed
        text box_image_url
        timestamp created_at
        timestamp updated_at
    }

    tags {
        text id PK
        text value
        text color
        boolean is_roll_scoped
        boolean is_stock_scoped
        boolean is_system
        timestamp created_at
        timestamp updated_at
    }

    stock_tags {
        text id PK
        text stock_key FK
        text tag_key FK
        timestamp created_at
    }

    rolls {
        text id PK
        text roll_id
        text stock_key FK
        text state
        text images_url
        timestamp date_obtained
        text obtainment_method
        text obtained_from
        timestamp expiration_date
        integer times_exposed_to_xrays
        text loaded_into
        timestamp created_at
        timestamp updated_at
    }

    roll_states {
        text id PK
        text state_id
        text roll_id FK
        text state
        timestamp date
        text notes
        jsonb metadata
        boolean is_error_correction
        timestamp created_at
        timestamp updated_at
    }

    roll_tags {
        text id PK
        text roll_key FK
        text tag_key FK
        timestamp created_at
    }

    transition_states {
        uuid id PK
        string name
    }

    transition_types {
        uuid id PK
        string name
    }

    transition_metadata_field_types {
        uuid id PK
        string name
    }

    transitions {
        uuid id PK
        uuid from_state_id FK
        uuid to_state_id FK
        uuid transition_type_id FK
        boolean requires_date
    }

    transition_metadata {
        uuid id PK
        uuid transition_id FK
        string field
        uuid field_type_id FK
        string default_value
        boolean is_required
    }

    film_formats ||--o{ stocks : "format_key"
    stocks ||--o{ stocks : "base_stock_key (self-ref)"
    stocks ||--o{ rolls : "stock_key"
    stocks ||--o{ stock_tags : "stock_key"
    tags ||--o{ stock_tags : "tag_key"
    rolls ||--o{ roll_states : "roll_id"
    rolls ||--o{ roll_tags : "roll_key"
    tags ||--o{ roll_tags : "tag_key"
    transition_states ||--o{ transitions : "from_state_id"
    transition_states ||--o{ transitions : "to_state_id"
    transition_types ||--o{ transitions : "transition_type_id"
    transitions ||--o{ transition_metadata : "transition_id"
    transition_metadata_field_types ||--o{ transition_metadata : "field_type_id"
```

## Notes

- `*_default` shadow tables mirror the main tables (`film_formats_default`, `stocks_default`, `tags_default`, `stock_tags_default`) and hold the seed data that is imported on startup. They are structurally identical to their main counterparts and are omitted from this diagram for clarity.
- `stocks.base_stock_key` is a self-referential foreign key used to link a rebranded or re-emulsioned stock back to its base formulation (e.g., a store-brand film back to its OEM stock).
- `roll_states.metadata` is a JSONB column holding state-specific data (temperatures, ISO, lab details, scan links, etc.) keyed by field name as defined in `transition_metadata`.
- The `transition_states` / `transitions` / `transition_metadata` tables define the DB-driven state machine — valid roll lifecycle transitions and their associated metadata fields are read from these tables at runtime.
