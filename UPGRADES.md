# Deferred Dependency Upgrades

These major version upgrades are available but require code changes. Tackle after the app is feature complete.

---

## Backend (frollz-api)

### NestJS v10 → v11
- Update all `@nestjs/*` packages together (they must stay in sync)
- Upgrade `reflect-metadata` from `^0.1.13` to `^0.2.2` (required by NestJS v11)
- Review [NestJS v11 migration guide](https://docs.nestjs.com/migration-guide) for any breaking API changes

### arangojs v8 → v10
- Review the arangojs changelog for API changes between v8 and v10
- Pay attention to changes in cursor handling, query methods, and authentication

### uuid v9 → v13
- v10+ is ESM-only and will break the current CommonJS setup (`"module": "commonjs"` in tsconfig)
- Either switch the API to ESM, or replace uuid with the Node.js built-in `crypto.randomUUID()` (available since Node 16, no import needed)

---

## Frontend (frollz-ui)

### Tailwind CSS v3 → v4
- The config format is completely different — `tailwind.config.js` is replaced by a CSS-based config
- The custom `primary` color palette in `tailwind.config.js` will need to be moved to `style.css` using CSS variables
- PostCSS config changes required
- Review the [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide)

### Vite v5 → v8
- Update `@vitejs/plugin-vue` to v6 at the same time (requires Vite 8)
- Check `vite.config.ts` for any deprecated options

### vue-router v4 → v5
- Review the vue-router v5 changelog for breaking changes in route definitions and navigation guards

### Pinia v2 → v3
- Review the Pinia v3 changelog for store API changes

---

## Tooling

### ESLint v8 → v10
- ESLint v9+ uses a flat config (`eslint.config.js`) instead of `.eslintrc`
- The `@vue/eslint-config-*` and `@typescript-eslint/*` plugins will also need compatible versions
- Use the [ESLint config migrator](https://eslint.org/docs/latest/use/configure/migration-guide) to convert existing config

### TypeScript ~5.3 → ~5.9 (ui) / ^5.1 → ^5.4 (api)
- Generally safe within minor versions, but run `type-check` after upgrading to catch any new strict checks
