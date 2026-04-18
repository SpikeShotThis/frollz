---
name: feature
description: Full DDD feature implementation from a GitHub issue — walks through shared Zod schema → domain entity → repository interface → mapper → Knex repository → service → controller → module → migration → UI api-client → store/view/components. Use when starting any new domain feature.
---

# Feature Skill — Frollz DDD Flow

You are implementing a full-stack feature in the Frollz monorepo following the project's DDD conventions. Work through each step in order. Do not skip layers. Do not create UI-local types — all types come from `@frollz/shared`.

## Pre-flight

1. Confirm the GitHub issue number and slug for branch naming.
2. Confirm you are on a feature branch: `feat/{issue}-{slug}` off `develop`.
3. Read the current state of `packages/shared/src/index.ts` to understand existing schemas.

## Implementation Order

### Step 1 — Shared Zod Schema (`packages/shared/src/index.ts`)

Define all schemas for the new domain:
- Entity schema (the full domain object as returned by the API)
- Create DTO schema (input for POST)
- Update DTO schema (input for PATCH — all fields optional)
- Any query/filter schemas needed

Infer TypeScript types from each schema with `z.infer<typeof Schema>`.

After editing: `cd packages/shared && pnpm build`

### Step 2 — Domain Entity (`apps/frollz-api/src/domain/{domain}/entities/{domain}.entity.ts`)

Plain TypeScript class or interface. No Knex, no NestJS decorators. Uses types from `@frollz/shared`.

### Step 3 — Repository Interface (`apps/frollz-api/src/domain/{domain}/repositories/{domain}.repository.interface.ts`)

Define the abstract contract:
```ts
export abstract class I{Domain}Repository {
  abstract findAll(): Promise<{Domain}[]>;
  abstract findById(id: number): Promise<{Domain} | null>;
  abstract create(dto: Create{Domain}Dto): Promise<{Domain}>;
  abstract update(id: number, dto: Update{Domain}Dto): Promise<{Domain}>;
  abstract delete(id: number): Promise<void>;
}
```

### Step 4 — Mapper (`apps/frollz-api/src/infrastructure/persistence/{domain}/{domain}.mapper.ts`)

Translates between raw Knex rows and domain entities. Validate with Zod inside the mapper — never cast raw DB results.

### Step 5 — Knex Repository (`apps/frollz-api/src/infrastructure/persistence/{domain}/{domain}.knex.repository.ts`)

Implements the repository interface. Uses the mapper. No business logic here.

### Step 6 — Service (`apps/frollz-api/src/modules/{domain}/{domain}.service.ts`)

Depends on the repository interface (injected by token). Contains all business logic. Returns domain entities.

### Step 7 — Controller (`apps/frollz-api/src/modules/{domain}/{domain}.controller.ts`)

RESTful endpoints. Validates input with Zod pipe or class-validator DTOs. Calls service. Returns typed responses.

### Step 8 — Module (`apps/frollz-api/src/modules/{domain}/{domain}.module.ts`)

Registers the controller, service, and repository provider (concrete Knex impl bound to abstract token).

### Step 9 — Register in AppModule (`apps/frollz-api/src/app.module.ts`)

Add the new module to the `imports` array.

### Step 10 — Migration (`apps/frollz-api/migrations/YYYYMMDDHHmmss_{description}.ts`)

- Use current timestamp for filename
- Implement both `up` and `down`
- Handle existing rows safely (defaults on NOT NULL columns, nullable if uncertain)
- Wrap multi-step operations in a transaction

Run: `cd apps/frollz-api && pnpm migrate`

### Step 11 — UI API Client (`apps/frollz-ui/src/services/api-client.ts`)

Add methods for the new endpoints. Import types from `@frollz/shared`. Parse every response with `.parse()` — never `as SomeType`.

### Step 12 — UI Store / View / Components / Router

Follow existing patterns in `apps/frollz-ui/src/`. Use Pinia for state. Import types from `@frollz/shared` only.

## Verification

```bash
cd packages/shared && pnpm build
pnpm check-types          # from repo root
pnpm lint                 # from repo root
cd apps/frollz-api && pnpm migrate
pnpm test                 # from repo root
```

## Commit

Use `/commit` skill after each logical step.
