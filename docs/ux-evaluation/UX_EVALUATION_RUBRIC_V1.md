# UX Evaluation Rubric v1

## Purpose
Use this rubric to score core admin UX quality for photographer workflows in `apps/web`.  
The rubric produces a weighted score (0-100) and a pass/fail outcome that maps directly to implementation priority.

## Scoring Model
- Scale per category: `1` (critical), `2` (major), `3` (adequate), `4` (good), `5` (excellent)
- Weighted score formula: `(category score / 5) * category weight`
- Total score: sum of all weighted category scores
- Pass threshold: `>= 80`
- Conditional pass: `75-79` only if no category is below `3`
- Fail: `< 75` or any category score `1-2` in accessibility or form usability

## Categories and Weights

| Category | Weight | What is evaluated |
|---|---:|---|
| Navigation clarity | 15 | Wayfinding, page titles, active state clarity, predictable IA |
| Visual hierarchy | 15 | Scan order, heading structure, primary action prominence |
| Form usability | 15 | Label clarity, validation feedback, defaults, field grouping |
| Table scannability | 10 | Column clarity, row readability, sorting/filtering affordance |
| Consistency | 15 | Reuse of patterns, spacing, action placement, copy conventions |
| Accessibility | 15 | Keyboard, focus, semantics, labels, contrast baseline |
| Responsiveness | 10 | Usability at mobile/tablet/desktop breakpoints |
| Perceived performance | 5 | Loading/empty states, feedback timing, async visibility |

## Issue Taxonomy
- `P0 Critical`: blocks task completion or creates data-loss risk
- `P1 High`: high-frequency friction or major confusion
- `P2 Medium`: avoidable friction or inconsistency
- `P3 Low`: polish/clarity opportunities

## Priority Mapping Rules
- `P0`: any finding tied to blocked flow, destructive ambiguity, or inaccessible critical control
- `P1`: category scored `1-2` in high-weight areas (`navigation`, `visual hierarchy`, `form usability`, `accessibility`, `consistency`)
- `P2`: category scored `3` with concrete friction affecting speed/clarity
- `P3`: category scored `4` with quality gaps that do not materially slow tasks

## Minimum Evidence Required Per Screen
- One scorecard per page template (list, detail, admin utility, dashboard)
- At least one completed task path each for `discover`, `create`, `edit`, `filter/search`, and `destructive action`
- Accessibility pass notes for keyboard and semantic labels on the evaluated page

## Re-Scoring Rules After Remediation
- Re-score only after implementation is merged and smoke-tested
- Keep previous score snapshot for trend comparison
- Mark category as improved only when behavior changes, not just visual restyling
