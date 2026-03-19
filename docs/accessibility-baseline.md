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
| Lighthouse | **Requires a live running instance** | See [Lighthouse instructions](#lighthouse-instructions) below |

---

## Lighthouse Instructions

Lighthouse requires a running application. To record baseline scores:

```bash
# 1. Start the dev stack
docker compose -f docker-compose.dev.yml up -d

# 2. Run Lighthouse CLI against each route
npx lighthouse http://localhost:5173/           --output json --output-path lighthouse-dashboard.json
npx lighthouse http://localhost:5173/rolls      --output json --output-path lighthouse-rolls.json
npx lighthouse http://localhost:5173/stocks     --output json --output-path lighthouse-stocks.json
npx lighthouse http://localhost:5173/formats    --output json --output-path lighthouse-formats.json
npx lighthouse http://localhost:5173/tags       --output json --output-path lighthouse-tags.json
```

**Expected pre-fix score range:** 60–70 / 100 on all routes.
Primary score drivers: missing form labels (−20 to −30), missing modal ARIA roles (−10), and heading hierarchy issues (−5).

Update this table after running:

| Route | Lighthouse A11y Score | Date |
|---|---|---|
| `/` (Dashboard) | TBD | — |
| `/rolls` | TBD | — |
| `/rolls/:key` | TBD | — |
| `/stocks` | TBD | — |
| `/formats` | TBD | — |
| `/tags` | TBD | — |

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
