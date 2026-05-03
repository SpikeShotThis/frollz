# UX Remediation Backlog v1

## Legend
- Severity: `P0` critical, `P1` high, `P2` medium, `P3` low
- Effort: `S` (<= 1 day), `M` (2-4 days), `L` (5+ days)

## Foundation (Do First)

| ID | Item | Severity | Effort | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| UX-001 | Standardize field labels and helper text for all form controls | P1 | M | None | No placeholder-only fields in core flows; all required fields visibly labeled |
| UX-002 | Define action hierarchy styles (primary/secondary/destructive) | P1 | M | UX-001 | Destructive actions visually distinct and never equal prominence to submit |
| UX-003 | Add global destructive confirmation pattern | P0 | M | UX-002 | Delete/archive requires explicit confirmation containing entity name |
| UX-004 | Normalize page header and utility row structure | P1 | M | None | All core pages use same header + utility row pattern |
| UX-005 | Add loading/empty/error pattern primitives | P1 | M | None | Each list/detail flow exposes consistent loading, empty, and error states |

## Devices + Film (High-Impact Flows)

| ID | Item | Severity | Effort | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| UX-101 | Refactor devices list filter/search panel to canonical filter bar | P2 | S | UX-004 | Search + type filter aligned and labeled consistently |
| UX-102 | Rework device detail drawer footer actions and delete flow | P0 | S | UX-002, UX-003 | Delete moved to danger zone and requires confirmation |
| UX-103 | Group create/edit device fields by intent (identity/spec/use) | P1 | M | UX-001 | Field grouping and labels reduce ambiguity in create/edit |
| UX-104 | Normalize film list filter controls and table semantics | P2 | S | UX-004, UX-005 | Filters and table headings follow pattern spec |
| UX-105 | Improve film event form clarity and validation messaging | P1 | M | UX-001, UX-005 | Event fields labeled with inline validation and parse-safe feedback |

## Emulsions + Admin CRUD

| ID | Item | Severity | Effort | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| UX-201 | Standardize emulsion create/edit field layout and checkbox groups | P2 | M | UX-001 | All inputs labeled and grouped, format selection scannable |
| UX-202 | Add row action pattern for labs/suppliers lists | P1 | M | UX-002 | Edit/archive actions moved from inline paragraph text to action column |
| UX-203 | Normalize admin search + inactive toggle controls | P2 | S | UX-004 | Same ordering and labeling as filter-bar standard |
| UX-204 | Add explicit success/error feedback blocks for import/export actions | P1 | S | UX-005 | Users see clear result and recovery guidance per operation |

## Dashboard Harmonization

| ID | Item | Severity | Effort | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| UX-301 | Align dashboard heading scale and utility row with page standard | P2 | S | UX-004 | Dashboard shell pattern matches CRUD pages |
| UX-302 | Align dashboard CTA semantics with global button hierarchy | P2 | S | UX-002 | Card actions use canonical primary/secondary styling |

## Validation Tasks

| ID | Item | Severity | Effort | Dependencies | Acceptance Criteria |
|---|---|---|---|---|---|
| UX-401 | Re-score core pages using rubric v1 | P1 | S | All remediation | Weighted score >= 80 and no category < 3 |
| UX-402 | Run task-based QA scenarios across core flows | P1 | S | All remediation | Representative create/edit/filter/destructive tasks complete without blockers |
| UX-403 | Accessibility check for keyboard/focus/labels/semantics | P1 | S | All remediation | No critical keyboard or labeling failures in core flows |
| UX-404 | Responsive check at mobile/tablet/desktop breakpoints | P2 | S | All remediation | Critical controls remain visible and usable at all targets |
