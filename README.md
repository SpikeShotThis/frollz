# Frollz

Frollz is a self-hosted film photography tracking application. If you shoot on film and want a personal logbook for your rolls — where they are, what stock you used, when they were shot and developed, and what came back from the lab — Frollz is built for that.

## What it does

- **Track every roll** from purchase to receiving negatives back from the lab, with a full state history
- **Catalog your film stocks** with manufacturer, process, speed, format, and tags
- **Record transition details** — storage temperatures, shot ISO, lab name, push/pull stops, scan links, and more
- **Auto-tag rolls** with `expired`, `pushed`, `pulled`, and `cross-processed` based on the data you enter
- **Correct mistakes** — backward transitions are supported and flagged as corrections in the roll's history

## Screenshots

| | |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Rolls](docs/screenshots/rolls.png) |
| ![Roll detail](docs/screenshots/roll-detail.png) | ![Stocks](docs/screenshots/stocks.png) |
| ![Tags](docs/screenshots/tags.png) | |

## Self-hosting

Frollz is designed to be self-hosted. The baseline stack runs as four containers:

- `nginx` (ingress reverse proxy)
- `web` (built Next.js web app)
- `api` (built NestJS API)
- `postgres` (PostgreSQL 18)

### Prerequisites

- Docker with the Compose plugin (`docker compose`)

### Setup

**1. Clone the repository**

```bash
git clone https://github.com/joshholl/frollz.git
cd frollz
```

**2. Create your environment file**

```bash
cp .env.example .env
```

Open `.env` and set at least:

- `DATABASE_PASSWORD`
- `JWT_ACCESS_SECRET`

The defaults are safe for local testing only.

**3. Start the stack**

```bash
docker compose up -d
```

The ingress container publishes port **80** (`http://localhost` by default). API and database traffic stay on the internal Docker network.

**4. Access Frollz**

On first start, the API boot process auto-applies database changes and seeds reference data when `AUTO_MIGRATE_SEED=true`.

### Operations

```bash
docker compose logs -f
docker compose ps
docker compose down
```

### Updating

```bash
docker compose pull
docker compose up -d
```

Database updates run automatically on startup when `AUTO_MIGRATE_SEED=true`.

### Rebuild after code changes

```bash
docker compose build api web
docker compose up -d
```

### Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_DRIVER` | `postgres` | Selects DB runtime (`postgres` or `sqlite`) |
| `DATABASE_HOST` | `postgres` | PostgreSQL hostname (Compose service name) |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_NAME` | `frollz` | PostgreSQL database name |
| `DATABASE_USER` | `frollz` | PostgreSQL user |
| `DATABASE_PASSWORD` | `changeme` | PostgreSQL password (change this) |
| `DATABASE_URL` | `frollz2.sqlite` | SQLite file path when `DATABASE_DRIVER=sqlite` |
| `JWT_ACCESS_SECRET` | `change-me` | JWT signing secret |
| `ALLOWED_ORIGINS` | `http://localhost` | CORS allowlist (comma-separated) |
| `AUTO_MIGRATE_SEED` | `true` | Runs driver-specific migrations (`migrations-postgres` or `migrations`) and seeds reference data |
| `SEED_DEMO_USER` | `false` | Seeds demo user when `true` |
| `PORT` | `3000` | API listen port |

## Documentation

- [Architecture & technical overview](docs/adr/architecture.md)
- [Entity relationship diagram](docs/entity-relationship.md)
- [API reference](docs/api-reference.md)
- [Release checklist](docs/release-checklist.md)

## Contributing

1. Fork the repository
2. Create a feature branch from `development`
3. Make your changes with tests
4. Submit a pull request against `development`

## License

MIT
