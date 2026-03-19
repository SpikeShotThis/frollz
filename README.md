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

Frollz is designed to be self-hosted. It runs as two Docker containers: the application (NestJS API + Vue SPA bundled together) and a PostgreSQL database.

### Prerequisites

- Docker with the Compose plugin (`docker compose`)
- A reverse proxy for HTTPS (Nginx Proxy Manager, Traefik, or Caddy are all good options)

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

Open `.env` and set values for `POSTGRES_DATABASE`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. The defaults in `.env.example` work for a local test but **change the password** before exposing the instance to the internet.

**3. Start the stack**

```bash
docker compose up -d
```

The application starts on port **3000**. Point your reverse proxy at it and configure HTTPS.

**4. Access Frollz**

Once running, open your browser to the address you've configured. On first start, the database schema is created and default film stocks, formats, and tags are imported automatically.

### Updating

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically on startup — no manual steps needed.

### Configuration

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `postgres` | PostgreSQL hostname (matches the Compose service name) |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DATABASE` | — | Database name |
| `POSTGRES_USER` | — | Database user |
| `POSTGRES_PASSWORD` | — | Database password |
| `PORT` | `3000` | Port the application listens on |
| `DISABLE_DEFAULT_DATA_IMPORT` | unset | Set to `true` to skip importing default film stocks, formats, and tags on startup |

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
