# Admin Web Pattern Spec v1

## Intent
Define canonical web behavior for the admin experience so all core flows are intuitive, consistent, and accessible while preserving current functional contracts.

## Information Hierarchy
- Every page uses a standard structure:
  1. Page header: title + concise context sentence
  2. Utility row: search/filter controls and page-level actions
  3. Primary content block: table/list/card content
  4. Secondary actions: destructive/low-frequency controls
- Page title reflects user task, not domain internals (example: `Film Inventory`, `Device Detail`).
- First visible primary action must be singular and unambiguous.

## Canonical Component Patterns

### App Shell
- Keep persistent left navigation on desktop and top-level title in header.
- Active route style and icon treatment must be uniform across all links.
- Collapsed nav keeps icon-only access with `aria-label` and tooltip text.

### Page Header
- H1: 32-40px desktop, 26-30px mobile.
- One supporting sentence max, muted style, no secondary CTA in same row on narrow screens.

### Filter Bar
- Standard order: search field, categorical filters, toggles, reset action.
- Inputs align in a responsive grid (`1` col mobile, `2-4` cols desktop).
- Filter labels persist above controls; placeholders are examples only.

### Tables and Lists
- Canonical columns: entity name first, most decision-critical attribute second, state/status third.
- Row actions use a dedicated action column, not inline mixed with text content.
- Empty state block includes: message, likely cause, and one recovery CTA.

### Form Drawers
- Drawer contains:
  1. Context header
  2. Grouped fields (`Identity`, `Technical`, `Operational`, `Notes`)
  3. Sticky footer with primary + secondary actions
- All fields have visible labels and optional helper text.
- Required fields marked consistently; validation errors appear inline and summary appears at top.

### Action Hierarchy
- Primary action: solid accent.
- Secondary action: outline/ghost.
- Destructive action: explicit danger style + confirmation step.
- Destructive controls are never adjacent to primary submit in equal visual weight.

### Feedback States
- `Loading`: skeleton or spinner with text at block level.
- `Success`: inline confirmation near triggering action.
- `Error`: persistent inline message with recovery guidance.
- `Disabled`: explains why action is unavailable when possible.

## Interaction Rules
- Keyboard tab sequence follows visual reading order.
- Escape closes drawers/dialogs only when no unsaved edits or after confirmation.
- Submit actions show in-progress state and prevent duplicate submits.
- Delete/archive actions require confirmation modal with entity name.

## Copy and Labeling Standards
- Labels are noun-based and precise (`Film format`, `Development process`, `Occurred at`).
- Button text starts with verb (`Create film`, `Save changes`, `Archive lab`).
- Error copy states issue + next step (`Rating must be between 1 and 5`).

## Accessibility Baseline v1
- All form controls have programmatic labels.
- Focus indicators are visible and pass contrast expectations.
- Color is never the sole state signal; pair with icon/text.
- Tables include semantic headers and meaningful column names.
- Drawer and modal surfaces include proper roles and focus trapping.

## Rollout Sequence
1. Foundation: shared tokens and interaction semantics in global styles/components.
2. Devices + Film flows: apply full pattern set to highest-frequency operations.
3. Emulsions + Admin CRUD: align with the same pattern contract.
4. Dashboard: final harmonization pass to match hierarchy and action semantics.
