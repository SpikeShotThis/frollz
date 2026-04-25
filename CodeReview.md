 ---
  Summary

  The codebase is at a solid intermediate level. Architecture is well-structured (clean DDD layers, repository abstraction, transactional state machine), authentication is
  thoughtfully built (refresh token rotation, replay protection), and the type contract between API and UI is properly centralized in @frollz2/schema. The app would mostly
  work in production for a single user with low data volume.

  However, there are several production-blocking bugs and design decisions that will cause real failures at scale or under adversarial conditions. The most urgent issues are a
   broken validation error envelope, a full-table-scan query on the hot path, and the single-session-per-user architecture.

  Also: CLAUDE.md still describes Naive UI, but the codebase runs Quasar. The constraint documentation is stale.

  ---
  🔴 Critical Issues

  1. ZodSchemaPipe validation errors are swallowed on the frontend

  apps/api/src/common/pipes/zod-schema.pipe.ts:13 throws BadRequestException with body:
  { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": {...} }

  The onSend hook in main.ts:55 passes through bodies that have an error key or a data+meta pair. This body has neither — it has code. So the hook wraps it:
  { "data": { "code": "VALIDATION_ERROR", "message": "..." }, "meta": {} }

  The frontend's readApiError (api-envelope.ts:26) looks for payload.error.message. There is no error key. Every Zod validation failure on every form shows "Request failed" to
   the user instead of the actual field errors. This affects every form submission in the app.

  Fix: Either wrap BadRequestException in a DomainError, or add a second ExceptionFilter that catches HttpException and formats it into the same envelope. The onSend hook
  approach for envelope wrapping is inherently fragile — consider removing it and having every controller return the envelope explicitly, or use a response interceptor
  instead.

  ---
  2. findOccupiedFilmForDeviceId is a full table scan that breaks under load

  apps/api/src/infrastructure/repositories/mikro-orm-film.repository.ts:259 fetches every loaded journey event for the user, then filters in application memory. A user with 50
   rolls and 500 events will execute a query returning potentially hundreds of rows on every film load operation.

  const loadedEvents = await this.entityManager.find(
    FilmJourneyEventEntity,
    { user: userId, filmState: { code: 'loaded' } }, // no device filter!
    ...
  );

  The event log is append-only and unbounded. This method is called inside the hot path of applyLoadedEventSideEffects — directly inside the state transition transaction.

  Fix: Denormalize currentDeviceId onto FilmEntity (nullable, set on loaded event, cleared on removed), or add a device_id column to the current loaded events query.

  ---
  3. Single active session per user — any login kills all other sessions

  apps/api/src/infrastructure/repositories/mikro-orm-auth.repository.ts:57:
  await transactionalEntityManager.nativeDelete(RefreshTokenEntity, { user: input.userId });

  upsertRefreshToken is called on every login and register. It deletes all existing refresh tokens for the user first. A user logging in on their phone invalidates their
  desktop session. Someone who discovers another user's email could repeatedly hit /auth/register (which creates a new user and doesn't affect existing ones) — actually that
  doesn't apply here. But the self-DoS for multi-device use is real.

  Fix: Allow multiple refresh token rows per user (one per session). Add a device_name or session identifier column if needed. On logout, delete only the presented token.

  ---
  4. Email case-sensitivity allows duplicate accounts

  packages/schema/src/auth.ts:5 uses z.email() which validates format but does not normalize. user@example.com and USER@EXAMPLE.COM are treated as different emails. The
  database UNIQUE constraint on email is case-sensitive in SQLite by default, so both can be registered. A user who registers with uppercase will never be able to log in with
  lowercase.

  Fix: Add .toLowerCase().trim() transform to the email field in both registerRequestSchema and loginRequestSchema:
  email: z.email().transform((e) => e.toLowerCase().trim())

  ---
  5. canActivate return type any — TypeScript strict mode violation

  apps/api/src/modules/auth/jwt-auth.guard.ts:13:
  override canActivate(context: ExecutionContext): any {

  AuthGuard.canActivate returns boolean | Promise<boolean> | Observable<boolean>. Using any here silently disables type checking on this method — any accidental return
  undefined or return null would compile. This is a strict-mode violation in a security-critical path.

  Fix: Change to boolean | Promise<boolean> | Observable<boolean>.

  ---
  🟠 Major Issues

  6. updateAllFramesForFilm N+1 write pattern

  apps/api/src/modules/film/film.service.ts:879 loads every frame for a film, then issues an individual persist for each one. A 36-exposure roll generates 36 separate UPDATE
  statements inside every state transition transaction. For a 36-exposure roll this is tolerable; for a 4x5 bulk sheet film buyer with 50 sheets, it's 50 updates per
  transition.

  Fix: Use entityManager.nativeUpdate(FilmFrameEntity, { user: userId, legacyFilm: filmId }, { currentState: targetState.id }).

  ---
  7. idempotency_key table grows unbounded

  apps/api/src/infrastructure/entities/idempotency-key.entity.ts has no expiresAt column and no cleanup. Every idempotent request permanently stores the full serialized
  response payload (film details, device objects) in SQLite. After a year of use this table will contain thousands of rows with large JSON blobs.

  Fix: Add expiresAt TEXT NOT NULL (e.g. createdAt + 24h), add a DB index on it, and add a periodic cleanup (a simple nativeDelete on startup or via cron).

  ---
  8. @Unique({ properties: ['user', 'name'] }) on FilmEntity is an undocumented constraint

  apps/api/src/infrastructure/entities/film.entity.ts:7 applies a unique constraint on (user_id, name). The spec does not mention this. A user who buys two rolls of the same
  stock and names them both "Portra 400" will get a database-level unique constraint violation with no meaningful error message (it's not caught and translated to a
  DomainError).

  Fix: Either remove the constraint (duplicate names are valid for physical rolls) or handle the SQLite unique violation and throw a DomainError('CONFLICT', 'You already have
  a film with that name').

  ---
  9. Response bodies logged on every request

  apps/api/src/common/interceptors/logging.interceptor.ts:51 logs the full service response on every request:
  this.logger.log(`← ${method} ${url} ${reply.statusCode} (...)${formatPayload(data)}`);

  The redaction covers password, refreshToken, accessToken, token, authorization, secret by exact key match. All domain data (film names, device names, emulsion data, user
  email from GET /auth/me) is logged verbatim on every response. In a multi-user production deployment, this creates a privacy compliance concern and produces very large log
  output.

  Fix: Only log method, URL, status, and duration at INFO level. Log response bodies only at DEBUG level, gated by NODE_ENV !== 'production'.

  ---
  10. No rate limiting on auth endpoints

  POST /auth/login, POST /auth/register, and POST /auth/refresh have no brute force protection. The password minimum is 8 characters — a determined attacker can enumerate
  passwords against a known email. The refresh endpoint accepts tokens that are only 48 bytes of entropy — not weak, but still worth rate-limiting.

  Fix: Add @nestjs/throttler with a short-window limit on auth routes (e.g., 5 attempts per minute per IP).

  ---
  🟡 Minor Issues

  11. <style scoped> block in FilmPage.vue violates the zero-CSS constraint

  apps/ui/src/pages/FilmPage.vue:263 defines a custom .film-filters CSS grid. Several files also use inline style="min-width: ..." props. Quasar provides QGrid/QCol for
  responsive layout — these custom styles aren't needed and break the project constraint.

  12. nowIso() duplicated in three services

  film.service.ts:37, auth.service.ts:15, idempotency.service.ts:7 all define the same nowIso() function. Extract to a shared utility.

  13. Device occupancy logic duplicated between service and repository

  parseLoadedEventData is reimplemented twice: once in film.service.ts:810 and once in mikro-orm-film.repository.ts:8. Same parsing logic, same structure, separate maintenance
   surface.

  14. legacyFilm naming in production entities

  apps/api/src/infrastructure/entities/film-frame.entity.ts has a legacyFilm relation. The word "legacy" in a persistent entity name signals an in-progress schema migration.
  Any future developer reading this is left confused about whether to use legacyFilm or something else. Name it what it is, or complete the migration.

  15. Emulsion display string formatting in repository layer

  mikro-orm-film.repository.ts:244: emulsionName: \${emulsion.manufacturer} ${emulsion.brand} ${emulsion.isoSpeed}`` — presentation formatting logic belongs in a mapper, not a
   repository method.

  ---
  🔵 Suggestions

  - Pagination first. The GET /film and GET /film/:id/events endpoints will become expensive. Add cursor-based pagination before you have real data.
  - Consider a dedicated current_device_id column on Film. The device-occupancy logic is spread across event log scanning, slot state, and frame state. A single nullable FK
  would eliminate both the full-table-scan query and the resolveLoadedDeviceContext chain.
  - The FilmStockEntity / FilmEntity split is unexplained. If FilmStock represents a physical box/roll and Film represents an instance being tracked, make that distinction
  explicit in naming and docs. Right now they feel like the same thing with one named "legacy."
  - Add expiresAt to the refresh token query. findRefreshTokenByHash does not filter by expiresAt IS NULL OR expiresAt > now() at the DB level — it retrieves and then checks
  in application code. Filter at the query level to avoid loading expired records.

  ---
  Positive Notes

  - Refresh token rotation with replay grace window is implemented correctly and non-trivially. The rotateRefreshToken → rotateRefreshTokenFromPrevious fallback handles the
  concurrent-refresh race condition properly.
  - The state machine using a Map<string, string[]> transition table (instead of nested if/else) is clean and testable.
  - @frollz2/schema as the single source of truth for types between API and UI is the right call — no type drift.
  - The IdempotencyService correctly handles the concurrent-insert race via unique constraint + retry. That's a subtle pattern done right.
  - Mapper functions explicitly exclude passwordHash from all user representations — no accidental password hash leakage.
  - ZodSchemaPipe is clean and compact. The approach is correct, just the error envelope inconsistency needs fixing.

✻ Worked for 4m 49s

※ recap: Finished a full-stack roast review. Five critical issues flagged (validation error envelope bug, full table scan, single-session architecture, email normalization,
  and auth guard type leak). No changes were made. (disable recaps in /config)

