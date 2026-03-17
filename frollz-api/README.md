# Frollz API

## Description
Backend API for the Frollz film roll tracking system built with NestJS and ArangoDB.

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
- `ARANGODB_URL` - ArangoDB connection URL (default: http://localhost:8529)
- `ARANGODB_DATABASE` - Database name (default: frollz)
- `ARANGODB_USERNAME` - Database username (default: root)
- `ARANGODB_PASSWORD` - Database password (default: rootpassword)
- `PORT` - Application port (default: 3000)
- `DISABLE_DEFAULT_DATA_IMPORT` - When set to `true` or `1` (case-insensitive), skips loading default seed data and populating main collections on startup (default: `false`)