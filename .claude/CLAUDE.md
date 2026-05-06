# CLAUDE.md

## System Overview

Film tracking system with:

* FilmLot → Film → FilmFrame hierarchy
* FilmDevice system (camera, interchangeable_back, film_holder)
* Append-only event model

All state changes occur via Film or Frame journey events.

---

## Tooling Constraints

* Package manager: `pnpm` (never npm or yarn)
* Monorepo: Turborepo
* Backend: NestJS + Fastify + MikroORM
* Web: Next.js + React
* Mobile: Expo + React Native
* Validation/contracts: Zod (`packages/schema`)

Use existing scripts from root `package.json` and app-level `package.json`s.
Do not introduce alternative tooling without explicit need.

---

## Core Invariants

* FilmLot is the root of all film creation
* `POST /film` is deprecated and must not be used
* Film and Frame state changes are event-driven only
* Events are immutable (append-only)
* All non-GET endpoints must be idempotent
* All validation is defined in `packages/schema` (Zod)
* FilmDevice is the only device abstraction

---

## Source of Truth (do not duplicate)

* Schemas → `packages/schema`
* State machine → `filmTransitionMap`
* Format logic → `film-format-definition.ts`
* DB runtime → `database-runtime.ts`
* Entities → `apps/api/src/infrastructure/entities`

---

## Cross-Layer Development Rule (CRITICAL)

Almost all features require coordinated changes across:

1. `packages/schema`
2. `apps/api`
3. `apps/web`
4. `apps/mobile`

Never implement features in only one layer.

---

## Event System

Film and Frame lifecycle is controlled by events:

* Film events = active
* Frame events = supported (future-facing)

Load behavior is defined by schema discriminated unions:

* camera_direct
* interchangeable_back
* film_holder_slot

---

## Database Behavior

* SQLite → development
* Postgres → production
* Runtime selected via `resolveDatabaseRuntime()`

Never assume a specific database.

---

## Idempotency

All write endpoints:

* Require `Idempotency-Key`
* Must safely handle retries

---

## Web Constraints

* Built with Next.js App Router and React
* Styling via `apps/web/app/globals.css` and `@frollz2/design-tokens`
* Avoid ad-hoc styling
* Forms and interactions must follow schema definitions

---

## Do Not Do These

* Do not use `npm` or `yarn` (pnpm only)
* Do not duplicate schemas or types outside `packages/schema`
* Do not reimplement or hardcode state transitions (use `filmTransitionMap`)
* Do not bypass service layer business logic
* Do not perform partial state updates (events must be transactional)
* Do not assume a specific database (runtime decides)
* Do not hardcode web options that come from reference data or schema
* Do not implement features in only one layer (schema/api/web must stay aligned)

---

## Task Routing

* Domain logic → `docs/domain.md`
* API flows → `docs/api.md`
* Web behavior → `docs/ui.md`
* DB / infra → `docs/infra.md`
