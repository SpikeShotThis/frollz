# Code Review — Frollz API & UI

**Reviewed:** 2026-04-21  
**Reviewer:** Principal Engineer (AI-assisted)  
**Branch:** `develop`

---

## Summary

The domain model is clean, the DDD layering is mostly respected, and the state machine implementation is correct. However, there are **three production-blocking issues** that must be resolved before any production deployment: a hardcoded JWT fallback secret, request body logging that captures passwords and tokens in plaintext, and a demo user seeded unconditionally into whatever database the seed script targets. Middleware hygiene (CORS, rate limiting, body size limits) is also missing entirely.

---

## Fix Plan

### 🔴 Critical — Fix Before Any Deploy

---

#### CR-1: Hardcoded JWT fallback secret

**File:** `apps/frollz-api/src/modules/auth/auth.constants.ts`

**Problem:** `process.env['JWT_ACCESS_SECRET'] ?? 'dev-access-secret'` — if the env var is not set at deploy time, every JWT is signed with a publicly-known string. Anyone who reads the source can forge tokens and authenticate as any user.

**Fix:**
1. Remove the fallback entirely.
2. Add a startup assertion in `main.ts` before `app.listen()`:

```ts
if (!process.env['JWT_ACCESS_SECRET']) {
  throw new Error('JWT_ACCESS_SECRET must be set');
}
```

3. Document the required env vars in a `.env.example` file at the repo root.

---

#### CR-2: Passwords and refresh tokens logged in plaintext

**File:** `apps/frollz-api/src/common/interceptors/logging.interceptor.ts`

**Problem:** `JSON.stringify(body)` is called on every request. `POST /auth/login` logs `{ email, password }` in plaintext. `POST /auth/refresh` logs the raw refresh token. Anyone with log access owns every account.

**Fix:** Redact sensitive fields before logging:

```ts
const REDACTED_FIELDS = new Set(['password', 'refreshToken', 'token', 'passwordHash']);

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) =>
      [k, REDACTED_FIELDS.has(k) ? '[REDACTED]' : v]
    )
  );
}
```

Replace the `JSON.stringify(body)` call with `JSON.stringify(redactBody(body))`.

---

#### CR-3: Demo user seeded unconditionally into any database

**File:** `apps/frollz-api/src/infrastructure/seed.ts`

**Problem:** The demo user (`demo@example.com` / `password123`) is created whenever `pnpm db:seed` runs, regardless of environment. Running seed against a production database creates a known-credential account.

**Fix:** Gate demo user creation behind an explicit opt-in env var:

```ts
if (process.env['SEED_DEMO_USER'] === 'true') {
  // create demo user
}
```

Reference data seeding (emulsions, formats, states, etc.) is appropriate for production. The demo user is not.

---

### 🟠 Major — Fix Before Public Launch

---

#### CR-4: No CORS, no rate limiting, no body size limit, public Swagger UI

**File:** `apps/frollz-api/src/main.ts`

**Problems:**
- Fastify default allows all cross-origins
- Auth endpoints (`/auth/login`, `/auth/register`) are brute-forceable with no throttling
- No body size limit — `registerRequestSchema` has no max-length fields, so arbitrarily large payloads are accepted
- Swagger UI at `/api/docs` is publicly accessible — full API surface is documented to anyone

**Fixes:**

```ts
// CORS — restrict to known origins
app.enableCors({
  origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? false,
});

// Rate limiting — add @nestjs/throttler to AppModule
// ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])
// Apply ThrottlerGuard as APP_GUARD (or scope to auth routes only)

// Body size limit — set on FastifyAdapter init
const adapter = new FastifyAdapter({ bodyLimit: 1_048_576 }); // 1 MB

// Swagger — gate behind IP allowlist or remove from production build
// Option: only register SwaggerModule if NODE_ENV !== 'production'
if (process.env['NODE_ENV'] !== 'production') {
  SwaggerModule.setup('api/docs', app, document);
}
```

---

#### CR-5: Refresh token rows accumulate without bound

**File:** `apps/frollz-api/src/infrastructure/repositories/mikro-orm-auth.repository.ts` — `upsertRefreshToken`

**Problem:** Despite the name, this is a pure insert. Each login creates a new row. A user who logs in repeatedly accumulates unlimited valid refresh tokens with no cleanup.

**Fix (single active token per user):**

```ts
async upsertRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
  await this.em.nativeDelete(RefreshTokenEntity, { user: userId });
  const token = this.em.create(RefreshTokenEntity, { user: userId, tokenHash, expiresAt, createdAt: new Date().toISOString() });
  await this.em.persistAndFlush(token);
}
```

If multi-device support is needed, limit to N most recent and delete oldest on insert.

---

#### CR-6: Login and register don't check `response.ok` before parsing

**File:** `apps/frollz-ui/src/stores/auth.ts`

**Problem:** On a 401 or 500 response, `tokenPairSchema.parse(await response.json())` throws a `ZodError` instead of surfacing a user-friendly message. `restoreSession()` correctly checks `response.ok` — `login()` and `register()` do not.

**Fix:** Apply the same guard used in `restoreSession()`:

```ts
const response = await fetch(/* ... */);
if (!response.ok) {
  const err = await response.json().catch(() => ({}));
  throw new Error((err as { error?: { message?: string } }).error?.message ?? 'Login failed');
}
const data = tokenPairSchema.parse(await response.json());
```

---

#### CR-7: Schema management via `updateSchema()` — no versioned migrations

**File:** `apps/frollz-api/src/infrastructure/migrate.ts`

**Problem:** `orm.schema.updateSchema()` is a schema diff tool, not a migration system. There is no migration history, no rollback capability, and no audit trail. The `migrations/` directory configured in `mikro-orm.config.ts` does not exist.

**Fix:**
1. Create the `migrations/` directory.
2. Replace `updateSchema()` with the MikroORM migrator:

```ts
const migrator = orm.getMigrator();
await migrator.up();
```

3. Generate the initial migration from the current schema:

```bash
pnpm mikro-orm migration:create --initial
```

4. Update `pnpm db:migrate` to run `migrator.up()`.

---

#### CR-8: State transition map duplicated between API and UI

**Files:**
- `apps/frollz-api/src/domain/film/film-state-machine.ts` — `filmTransitionMap`
- `apps/frollz-ui/src/pages/FilmDetailPage.vue` — `nextStateMap` (hardcoded inline)

**Problem:** The UI duplicates the valid transition logic to decide which "next state" buttons to show. These two definitions can drift independently, causing the UI to offer transitions the API will reject or fail to offer transitions the API permits.

**Fix (preferred):** Move `filmTransitionMap` into `packages/schema` so both apps import from the same source:

```ts
// packages/schema/src/film-transitions.ts
export const filmTransitionMap: Record<string, string[]> = {
  purchased: ['stored', 'loaded'],
  stored: ['stored', 'loaded'],
  // ...
};
```

**Fix (alternative):** Have `GET /film/:id` return a `validNextStates: string[]` field computed by the service, and have the UI derive button visibility from that instead.

---

### 🟡 Minor — Clean Up When Convenient

---

#### CR-9: Dead code in `FilmRepository`

`FilmRepository.create()` and `FilmRepository.createEvent()` are never called. `FilmService` uses `entityManager.transactional()` directly for all write operations. The repository interface implies a contract that isn't honored.

**Fix:** Route all writes through the repository (preferred — keeps the abstraction consistent), or remove the dead methods and document in a comment that write operations go via the EM directly.

---

#### CR-10: N+1 query in `findOccupiedFilmForDevice` — duplicated in two services

Both `FilmService` and `DevicesService` contain identical logic that loads all `loaded`/`exposed` films then calls `findLatestEvent` for each one individually.

**Fix:** Extract a single repository method that joins films and their latest events in one query. Remove the duplicate in `DevicesService` and have both services call the shared method.

---

#### CR-11: `ReferenceService.getAll()` has no route — UI makes 9 requests on load

`ReferenceService.getAll()` aggregates all reference data but is not exposed via any controller endpoint. The UI makes 9 separate requests on app load as a result.

**Fix:**
1. Add `GET /api/v1/reference` → `ReferenceService.getAll()` to `ReferenceController`.
2. Update `apps/frollz-ui/src/stores/reference.ts` `loadAll()` to call the single endpoint.

---

#### CR-12: `allowGlobalContext: true` in MikroORM config

**File:** `apps/frollz-api/src/infrastructure/database.module.ts`

This bypasses MikroORM's per-request identity map safety. Under concurrent load, entity state can bleed between requests. The correct pattern with NestJS + Fastify is to use `MikroOrmMiddleware` (or a custom interceptor) to fork the `EntityManager` per request.

**Fix:** Remove `allowGlobalContext: true` and add the request-scope middleware:

```ts
// In AppModule
configure(consumer: MiddlewareConsumer) {
  consumer.apply(MikroOrmMiddleware).forRoutes('*');
}
```

---

#### CR-13: Unsafe type assertions in mappers

```ts
currentStateCode: film.currentState.code as FilmSummary['currentStateCode']
```

This silences TypeScript without runtime validation. A state code outside the known enum passes through silently.

**Fix:** Parse through the schema at the mapper boundary:

```ts
import { filmStateCodes } from '@frollz/shared';
// or use z.enum(filmStateCodes).parse(film.currentState.code) to get a runtime error on bad data
```

---

### 🔵 Suggestions — Good to Have

---

#### CR-14: No Content Security Policy

`apps/frollz-ui/index.html` has no CSP meta tag. The auth store comment acknowledges the localStorage refresh token XSS risk — a strict CSP is the primary mitigation.

Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

Adjust `style-src` as needed for Naive UI's runtime styles.

---

#### CR-15: Inconsistent form validation in UI

`FilmPage.vue` create form uses ad-hoc `if (!form.field)` guards. Login, register, and the event creation drawer use `useZodForm`. Apply `useZodForm` consistently across all forms.

---

#### CR-16: `useApi` re-instantiated per store action

`const { request } = useApi()` is called inside each store action body. Create the composable once at the top level of each store definition.

---

#### CR-17: `.env.example` missing

There is no `.env.example` documenting required environment variables. Add one:

```
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=frollz.sqlite
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
SEED_DEMO_USER=false
```

---

## Priority Order

| # | Issue | Severity | Effort |
|---|---|---|---|
| CR-1 | JWT fallback secret | 🔴 Critical | XS |
| CR-2 | Plaintext credential logging | 🔴 Critical | XS |
| CR-3 | Demo user in prod seed | 🔴 Critical | XS |
| CR-4 | CORS / rate limit / body limit / Swagger | 🟠 Major | S |
| CR-5 | Unbounded refresh token accumulation | 🟠 Major | S |
| CR-6 | Login/register missing `response.ok` check | 🟠 Major | XS |
| CR-7 | Versioned migrations | 🟠 Major | M |
| CR-8 | Duplicated state transition map | 🟠 Major | S |
| CR-9 | Dead repository methods | 🟡 Minor | XS |
| CR-10 | N+1 query / code duplication | 🟡 Minor | S |
| CR-11 | Missing aggregate reference endpoint | 🟡 Minor | XS |
| CR-12 | MikroORM global context | 🟡 Minor | S |
| CR-13 | Unsafe mapper type assertions | 🟡 Minor | XS |
| CR-14 | CSP header | 🔵 Suggestion | XS |
| CR-15 | Inconsistent form validation | 🔵 Suggestion | S |
| CR-16 | `useApi` re-instantiated per action | 🔵 Suggestion | XS |
| CR-17 | `.env.example` missing | 🔵 Suggestion | XS |
