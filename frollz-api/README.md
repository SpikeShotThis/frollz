# Frollz API

## Description
Backend API for the Frollz film roll tracking system built with NestJS and PostgreSQL.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Documentation
When the application is running, visit `http://localhost:3000/api/docs` for Swagger documentation.

## Environment Variables
- `POSTGRES_HOST` - PostgreSQL host (default: localhost)
- `POSTGRES_PORT` - PostgreSQL port (default: 5432)
- `POSTGRES_DATABASE` - Database name (default: frollz)
- `POSTGRES_USER` - Database username (default: frollz)
- `POSTGRES_PASSWORD` - Database password (default: frollz)
- `PORT` - Application port (default: 3000)
- `DISABLE_DEFAULT_DATA_IMPORT` - When set to `true` or `1` (case-insensitive), skips loading default seed data and populating main tables on startup (default: `false`)