# Admin UX Audit: Core Flows

## Scope
- Dashboard
- Film list/detail
- Devices list/detail
- Emulsions list/detail
- Admin film labs, film suppliers, data export/import

## Method
- Design-system-led audit against `UX Evaluation Rubric v1`
- Flow checks: discover, create, edit, filter/search, destructive action
- Source review of core web implementations in `apps/web/src/components`

## Overall Result
- Weighted score: `59 / 100`
- Outcome: `Fail` (below threshold and accessibility/form issues present)

## Category Scores

| Category | Weight | Score (1-5) | Weighted |
|---|---:|---:|---:|
| Navigation clarity | 15 | 4 | 12.0 |
| Visual hierarchy | 15 | 2 | 6.0 |
| Form usability | 15 | 2 | 6.0 |
| Table scannability | 10 | 5 | 10.0 |
| Consistency | 15 | 3 | 9.0 |
| Accessibility | 15 | 2 | 6.0 |
| Responsiveness | 10 | 3 | 6.0 |
| Perceived performance | 5 | 4 | 4.0 |
| **Total** | **100** |  | **59.0** |

## Key Findings by Severity

### P0 Critical
1. **Destructive actions lack explicit confirmation**
- `Delete` actions in detail drawers can be triggered from the same visual tier as save actions.
- Risk: accidental data deletion and high operator anxiety.
- Affected flows: devices, emulsions.

### P1 High
1. **Page-level hierarchy is inconsistent across core screens**
- Heading sizes, section spacing, and action grouping vary heavily between dashboard and CRUD pages.
- Effect: reduced scan speed and unclear primary task on entry.

2. **Forms rely on placeholders as labels in many places**
- Inputs often have no persistent field labels, reducing clarity and screen reader quality.
- Effect: higher error rate in create/edit workflows.

3. **Primary/secondary/destructive button semantics are not standardized**
- Button styles do not always signal action criticality.
- Effect: more hesitation and potential mis-clicks.

4. **Limited explicit feedback for async state transitions**
- Some actions show loading states; others do not consistently indicate in-progress/success/failure at field or row level.
- Effect: uncertainty after submit/toggle operations.

### P2 Medium
1. **Table patterns are under-specified**
- No consistent empty state blocks, sortable headers, or row action affordances.

2. **Filter regions are not normalized**
- Search and filter controls differ in placement, grouping, and behavior across domains.

3. **Drawer forms lack grouped sections for complex inputs**
- Multi-field workflows (film event, emulsion formats) are not segmented.

### P3 Low
1. **Dashboard and admin pages use divergent visual language**
- Creates perceived product fragmentation.

## Flow Friction Matrix

| Flow type | Representative issue | Severity |
|---|---|---|
| Discover | Mixed heading and section structure slows orientation | P1 |
| Create | Placeholder-driven forms increase entry ambiguity | P1 |
| Edit | Edit drawer patterns differ between domains | P2 |
| Filter/Search | Filter panel structure not consistent | P2 |
| Destructive | Missing confirmation contract for delete/archive | P0 |

## Recommended Remediation Order
1. Foundation standards: tokens, hierarchy, action semantics, label rules
2. High-impact workflows: devices + film
3. Remaining domain flows: emulsions + admin CRUD
4. Dashboard conformance pass and cross-page consistency verification
