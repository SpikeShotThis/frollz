# Accessibility Baseline — Frollz v0.2.0

**Audited:** 2026-03-19
**Branch:** `feature/192-accessibility-audit-baseline`
**Scope:** All five UI routes + shared components
**Standard:** WCAG 2.1 AA

---

## Methodology

| Tool | How run | Notes |
|---|---|---|
| `eslint-plugin-vuejs-accessibility` | `npm run lint` in `frollz-ui` | Added in #189; enforces rules at lint time |
| `axe-core` (WCAG 2.1 AA ruleset) | `npm run test` in `frollz-ui` | Added in #190; runs against NavBar, TypeaheadInput, SpeedTypeaheadInput, RollsView (empty state) |
| Manual code review | Source files read directly | All five views + shared components inspected for structural, semantic, and interaction issues |
| Lighthouse CI | GitHub Actions `lighthouse` job — runs on every PR | Added in #191; audits `/`, `/rolls`, `/stocks` against WCAG 2.1 AA thresholds |

---

## Lighthouse CI

Lighthouse CI runs automatically on every PR via GitHub Actions (`lighthouse` job in `ci-cd.yml`). It builds the UI, serves it statically, and audits three key routes.

**Score thresholds (configured in `lighthouserc.js`):**

| Category | Minimum |
|---|---|
| Accessibility | 90 |
| Best Practices | 90 |
| Performance | 80 (mobile) |

CI will report failures until the v0.2.0 accessibility issues (#199–#206) are resolved. This is intentional — the gate enforces that work is complete before scores pass.

### Self-hosted LHCI Dashboard

The LHCI server is included in the dev stack (`docker-compose.dev.yml`) and stores historical scores:

```bash
docker compose -f docker-compose.dev.yml up -d lhci-server
# Dashboard: http://localhost:9001
```

To connect CI to your running dashboard, add these GitHub repository secrets:

| Secret | Description |
|---|---|
| `LHCI_SERVER_BASE_URL` | Public URL of your LHCI server (e.g. `https://lhci.example.com`) |
| `LHCI_TOKEN` | Build token — generate with `lhci wizard` |

```bash
# One-time setup: generate project + token
npx @lhci/cli wizard --serverBaseUrl http://localhost:9001
```

Without these secrets CI still collects, asserts, and uploads to temporary public storage.

### Manual Run

```bash
cd frollz-ui && npm run build && cd ..
npx @lhci/cli autorun
# Requires serve: npm install -g serve  (or npx serve is used automatically)
```

**Expected pre-fix score range:** 60–70 / 100 on accessibility.
Primary drivers: missing form labels (−20 to −30), missing modal ARIA roles (−10).

Update this table after first successful CI run:

| Route | Lighthouse A11y Score | Date |
|---|---|---|
| `/` (Dashboard) | TBD | — |
| `/rolls` | TBD | — |
| `/stocks` | TBD | — |

---

## Summary of Findings

| Severity | Count | Status |
|---|---|---|
| Critical | 2 | Tracked in follow-up issues |
| Serious | 2 | Tracked in follow-up issues |
| Moderate | 6 | 2 fixed in this story; 4 tracked |
| Minor | 3 | Tracked in follow-up issues |
| **Total** | **13** | |

---

## Critical

### A-C1 — Modals lack all required ARIA roles and focus management
**WCAG:** 4.1.2 (Name, Role, Value), 2.1.1 (Keyboard), 2.4.3 (Focus Order)
**Affects:** All five modals (Add Roll, Add Stock, Add Film Format, Delete Tag, Remove Stock Scope)
**Detail:** All modals are implemented as plain `<div class="fixed inset-0...">` with no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, no focus trap, and no Escape key handler. Screen readers cannot identify the modal or navigate it correctly; keyboard users cannot be trapped inside and risk losing context.
**Tracked:** #202

### A-C2 — Interactive `<span>` and `<td>` elements with click handlers only
**WCAG:** 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value)
**Affects:** RollsView (state badge filter chips), StocksView (process badge + tag chips)
**Detail:** Several `<span>` and `<td>` elements have `@click` handlers that add table filters but have no keyboard equivalent (`@keydown`), no `role="button"`, and no `tabindex`. Keyboard-only and AT users cannot activate these filters.
**Tracked:** #202

---

## Serious

### A-S1 — Form inputs without programmatically associated labels (32+ instances)
**WCAG:** 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value)
**Affects:** RollsView (Add Roll modal — 9 fields), StocksView (Add Stock modal — 7 fields), RollDetailView (transition metadata form — 12 fields), FilmFormatsView (Add Film Format modal — 2 fields), TagsView (inline table edits — 4 fields)
**Detail:** Labels and their associated controls are not linked via `for`/`id` attributes. Screen readers cannot announce the correct label when an input receives focus. Wrapping-label pattern is used in some places but `label-has-for` still requires explicit association.
**Tracked:** #199

### A-S2 — TypeaheadInput / SpeedTypeaheadInput missing ARIA combobox pattern
**WCAG:** 4.1.2 (Name, Role, Value), 1.3.1 (Info and Relationships)
**Affects:** All uses of `TypeaheadInput` (brand, manufacturer) and `SpeedTypeaheadInput` (ISO speed) in StocksView
**Detail:** The input has no `role="combobox"`, `aria-expanded`, `aria-autocomplete`, or `aria-controls`. The dropdown `<ul>` has no `role="listbox"` and `<li>` items have no `role="option"` or `aria-selected`. Screen readers cannot understand that this is a combobox with a suggestion list.
**Tracked:** #201

---

## Moderate

### A-M1 — No skip-to-content link
**WCAG:** 2.4.1 (Bypass Blocks)
**Affects:** All routes
**Detail:** Keyboard users must tab through the entire NavBar (5 links + 1 button) on every page load/navigation before reaching main content.
**Tracked:** #204

### A-M2 — Duplicate `<h1>` on every page ✅ FIXED
**WCAG:** 1.3.1 (Info and Relationships)
**Affected:** All routes
**Detail:** `NavBar.vue` rendered the "Frollz" brand as `<h1>` while each view also renders its page title as `<h1>`. Every page had two `<h1>` elements, which confuses AT heading navigation.
**Fix:** Changed NavBar brand from `<h1>` to `<span>` in this story. Each view's `<h1>` is now the sole page-level heading.

### A-M3 — Dashboard stat cards skip heading level (h1 → h3) ✅ FIXED
**WCAG:** 1.3.1 (Info and Relationships)
**Affected:** `/` (Dashboard)
**Detail:** The four stat widget headings ("Total Rolls", "Available Stocks", etc.) used `<h3>` directly under the page `<h1>`, skipping `<h2>`. Screen readers and AT users relying on heading navigation encountered an unexpected skip.
**Fix:** Changed all four stat widget headings from `<h3>` to `<h2>` in this story.

### A-M4 — `<nav>` element missing `aria-label`
**WCAG:** 4.1.2 (Name, Role, Value)
**Affects:** All routes
**Detail:** The `<nav>` landmark in `NavBar.vue` has no `aria-label`. When a page has multiple navigation landmarks (e.g. pagination added later), screen readers cannot distinguish them. Recommended value: `aria-label="Main navigation"`.
**Tracked:** #204

### A-M5 — Page `<title>` is static and never updates per route
**WCAG:** 2.4.2 (Page Titled)
**Affects:** All routes
**Detail:** `index.html` sets `<title>Frollz - Film Roll Tracker</title>` and it never changes. Users of screen readers, browser history, and tabs cannot distinguish between routes.
**Tracked:** #204

### A-M6 — Loading state has no live region
**WCAG:** 4.1.3 (Status Messages)
**Affects:** `/rolls/:key` (RollDetailView)
**Detail:** The "Loading..." message is rendered as a plain `<div>` with no `role="status"` or `aria-live` attribute. Screen readers are not notified when loading completes and content appears. Other views have no loading feedback at all.
**Tracked:** #203

---

## Minor

### A-N1 — Roll state conveyed by colour alone
**WCAG:** 1.4.1 (Use of Color)
**Affects:** RollsView (state column badges), RollDetailView (state chip under roll ID)
**Detail:** Roll state (ADDED, LOADED, FROZEN, etc.) is indicated by background colour via `getStateColor()`. No additional visual indicator (icon, pattern, text suffix) distinguishes states for users who cannot perceive colour.
**Tracked:** #205

### A-N2 — Colour contrast unverified for custom palette
**WCAG:** 1.4.3 (Contrast — Minimum)
**Affects:** All routes
**Detail:** The `primary-*` colour scale is custom (defined in `tailwind.config.js`). `text-primary-600` on white and `text-gray-500` on white/gray backgrounds have not been verified to meet the 4.5:1 ratio for normal text. Requires Lighthouse or a contrast checker against the actual rendered colours.
**Tracked:** #205

### A-N3 — Touch targets may not meet 44×44 px minimum
**WCAG:** 2.5.5 (Target Size)
**Affects:** NavBar links (`px-3 py-2`), small transition buttons (`text-xs px-3 py-1`), tag chips, pagination controls
**Detail:** Several interactive elements use small padding classes that likely produce touch targets below the 44×44 px WCAG 2.5.5 recommendation. Exact sizes require a live render to measure.
**Tracked:** #206

---

## Route-by-Route Quick Reference

| Route | Critical | Serious | Moderate | Minor |
|---|---|---|---|---|
| `/` Dashboard | — | — | A-M1, ~~A-M2~~, ~~A-M3~~, A-M4, A-M5 | A-N2, A-N3 |
| `/rolls` | A-C1, A-C2 | A-S1 | A-M1, ~~A-M2~~, A-M4, A-M5 | A-N1, A-N2, A-N3 |
| `/rolls/:key` | A-C1 | A-S1 | A-M1, ~~A-M2~~, A-M4, A-M5, A-M6 | A-N1, A-N2, A-N3 |
| `/stocks` | A-C1, A-C2 | A-S1, A-S2 | A-M1, ~~A-M2~~, A-M4, A-M5 | A-N1, A-N2, A-N3 |
| `/formats` | A-C1 | A-S1 | A-M1, ~~A-M2~~, A-M4, A-M5 | A-N2, A-N3 |
| `/tags` | A-C1 | A-S1 | A-M1, ~~A-M2~~, A-M4, A-M5 | A-N2, A-N3 |

~~Strikethrough~~ = fixed in this story.

---

## Issue Tracker Mapping

| Finding ID | Description | GitHub Issue |
|---|---|---|
| A-C1 | Modals: no ARIA roles, no focus trap, no Escape | #202 |
| A-C2 | Clickable spans/tds without keyboard access | #202 |
| A-S1 | Form inputs without label associations | #199 |
| A-S2 | TypeaheadInput/SpeedTypeaheadInput: no ARIA combobox | #201 |
| A-M1 | No skip-to-content link | #204 |
| A-M2 | Duplicate `<h1>` | **Fixed #192** |
| A-M3 | Dashboard h1→h3 heading skip | **Fixed #192** |
| A-M4 | `<nav>` missing `aria-label` | #204 |
| A-M5 | Page `<title>` not updated per route | #204 |
| A-M6 | Loading state has no live region | #203 |
| A-N1 | State conveyed by colour alone | #205 |
| A-N2 | Colour contrast unverified | #205 |
| A-N3 | Touch targets potentially too small | #206 |
