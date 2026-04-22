# Development Devtools Guide

This repository includes Vue development tooling for the UI and automatic environment loading for the API.

- Vue Devtools (for `apps/ui`)

## Installed Tooling

- UI: `vite-plugin-vue-devtools`
- Cross-platform env support: `cross-env`
- API configuration: `@nestjs/config` + `dotenv` loader

## Development-Only Behavior

These checks ensure tooling stays off outside local development:

- UI Vite plugin is enabled only if `process.env['NODE_ENV'] === 'development'`
- API `NODE_ENV` controls `.env` file selection (`.env.development`, `.env.production`, etc.)

The `dev` scripts already set `NODE_ENV=development`:

- root: `pnpm dev`
- API: `pnpm --filter @frollz2/api dev`
- UI: `pnpm --filter @frollz2/ui dev`

## How To Use Vue Devtools

### Option 1: Built-in Vite plugin (recommended in this repo)

1. Start the UI:
   - `pnpm --filter @frollz2/ui dev`
2. Open the app in your browser.
3. Use the Vue Devtools UI provided by the plugin.

### Option 2: Browser extension (still supported)

You can also install and use the Vue browser extension. The repo configuration does not block extension usage.

## API Environment Loading

1. Start the API in development mode:
   - `pnpm --filter @frollz2/api dev`
2. Check startup output for the loaded env files:
   - `[env] loaded files: ...`
3. Confirm expected variables are coming from `apps/api/.env` or `apps/api/.env.{NODE_ENV}`.

## Quick Verification

### Verify tooling is active in development

1. Run `pnpm dev`.
2. Confirm UI devtools is available in the frontend dev session.
3. Confirm API startup logs show loaded env files.

### Verify tooling is off in production mode

1. Start API with `NODE_ENV=production`.
2. Confirm production env files are used (`.env.production*` if present).
3. Build/preview UI in non-development mode and confirm no devtools plugin behavior.

## Security Note

Keep secrets only in environment files and do not commit real production credentials.
