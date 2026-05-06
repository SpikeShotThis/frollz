# Development Devtools Guide

This repository includes Next.js development tooling for the web app and automatic environment loading for the API.

## Installed Tooling

- Web: Next.js development server (`apps/web`)
- Cross-platform env support: `cross-env`
- API configuration: `@nestjs/config` + `dotenv` loader

## Development-Only Behavior

These checks ensure tooling stays off outside local development:

- Web app: `pnpm --filter @frollz2/web dev` runs `next dev` on port 3001
- API: `NODE_ENV` controls `.env` file selection (`.env.development`, `.env.production`, etc.)

The `dev` scripts already set `NODE_ENV=development`:

- root: `pnpm dev`
- API: `pnpm --filter @frollz2/api dev`
- Web: `pnpm --filter @frollz2/web dev`

## How To Use Web Devtools

1. Start the web app:
   - `pnpm --filter @frollz2/web dev`
2. Open `http://localhost:3001` in your browser.
3. Use the browser's React Developer Tools extension or the Next.js dev overlay for component and runtime diagnostics.

The web app rewrites `/api` requests to the API service through `apps/web/next.config.ts`.

## API Environment Loading

1. Start the API in development mode:
   - `pnpm --filter @frollz2/api dev`
2. Check startup output for the loaded env files:
   - `[env] loaded files: ...`
3. Confirm expected variables are coming from `apps/api/.env` or `apps/api/.env.{NODE_ENV}`.

## Quick Verification

### Verify tooling is active in development

1. Run `pnpm dev`.
2. Confirm the web app is available at `http://localhost:3001`.
3. Confirm API startup logs show loaded env files.

### Verify tooling is off in production mode

1. Start API with `NODE_ENV=production`.
2. Confirm production env files are used (`.env.production*` if present).
3. Build/start the web app in production mode and confirm development-only overlays are absent.

## Security Note

Keep secrets only in environment files and do not commit real production credentials.
