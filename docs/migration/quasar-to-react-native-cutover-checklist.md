# Web + Expo Cutover Checklist

## Domain Porting Order
- [ ] Auth (login/register/session refresh)
- [ ] Dashboard summary views
- [ ] Film inventory list/detail/create/update events
- [ ] Device list/detail/create/edit
- [ ] Emulsion list/detail/create/edit
- [ ] Admin film labs + suppliers CRUD
- [ ] Admin data export/import

## Cross-Platform Shared Layer
- [x] `@frollz2/contracts` created and unit-tested for film dashboard helpers
- [x] `@frollz2/api-client` created with typed request/response validation
- [x] `@frollz2/design-tokens` created for cross-platform design tokens
- [x] Move reusable web utility logic into `@frollz2/contracts`
- [ ] Convert mobile screens to consume only shared contracts + client

## Quality Gates (Big-Bang Cutover)
- [ ] Web auth flow parity verified in E2E
- [ ] Film CRUD/event flow parity verified in E2E
- [ ] Device + emulsion CRUD parity verified in E2E
- [ ] Admin export/import parity verified in E2E
- [ ] Mobile smoke flows: auth, list/detail, create/edit
- [ ] Performance parity met on top 5 web routes
- [ ] Rollback plan prepared with existing web artifact retained for one release cycle

## Decommission Criteria
- [ ] Production staging sign-off for all critical paths
- [ ] Incident rollback drill completed
- [x] Legacy Vue web app removed after web cutover
