# UX Test Protocol v1

## Objective
Verify that post-remediation admin UX meets rubric quality and supports fast, low-friction operation for photographers managing equipment and film.

## Heuristic Validation
- Re-score:
  - dashboard
  - film list + detail
  - device list + detail
  - emulsion list + detail
  - admin labs/suppliers/data export
- Pass criteria:
  - weighted score `>= 80`
  - no category below `3`

## Task Scenarios
1. Create, edit, and delete a device without confusion or accidental destructive action.
2. Filter and locate a film entry by state and search text in under three interaction steps.
3. Add a film journey event with valid datetime and structured data without parsing errors.
4. Review dashboard signals and reach target domain page via obvious action.
5. Update film lab/supplier records and archive/restore safely.
6. Export and import data with visible operation feedback and recovery messaging.

## Accessibility Checks
- Keyboard-only traversal through nav, filter bars, tables, drawers, and modals.
- Visible focus ring on all interactive controls.
- Programmatic labels for all inputs/selects/checkboxes/file controls.
- Semantic table headers and descriptive action button labels.
- Non-color state communication for success/error/destructive affordances.

## Responsive Checks
- Target widths:
  - mobile: `360-430px`
  - tablet: `768-1024px`
  - desktop: `1280px+`
- Confirm:
  - no primary action is clipped or hidden
  - filter controls wrap predictably
  - tables remain readable or transform to list pattern as specified
  - drawers/modals remain operable with keyboard and touch

## Exit Criteria
- All `P0` and `P1` UX backlog items closed.
- No blocker issues in task scenarios.
- Rubric threshold met for every core page template.
