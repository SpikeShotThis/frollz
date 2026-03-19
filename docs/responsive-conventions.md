# Responsive Layout Conventions — Frollz v0.2.0

**Established in:** `feature/194-mobile-first-layout-conventions`
**Standard:** Mobile-first, WCAG 2.5.5, no horizontal scroll at 375 px (iPhone SE)

---

## Breakpoints

Tailwind v4 defaults are used without modification:

| Token | Min-width | Typical use |
|---|---|---|
| *(default)* | 0 px | Mobile layout |
| `sm:` | 640 px | Landscape phone / small tablet |
| `md:` | 768 px | Tablet portrait |
| `lg:` | 1024 px | Tablet landscape / desktop |
| `xl:` | 1280 px | Wide desktop |

Apply breakpoints in ascending order (`sm:` before `md:` before `lg:`). Never override mobile behaviour with a lower breakpoint — always build upward.

---

## Page Container

Every page's content is constrained by `<main>` in `App.vue`:

```html
<main class="max-w-screen-xl mx-auto page-x py-8">
```

- `max-w-screen-xl` — caps content at 1280 px on wide screens
- `mx-auto` — centres the column
- `page-x` — custom utility (defined in `style.css`); applies safe-area-aware horizontal padding: `1rem` on mobile, `1.5rem` on `sm+`, growing to match `env(safe-area-inset-left/right)` on notched devices
- `py-8` — vertical rhythm

`NavBar.vue`'s inner content wrapper uses the same `max-w-screen-xl mx-auto page-x` so nav links align with page content.

**Do not** add width-constraining classes (`container`, `max-w-*`, `w-*`) on the root `<div>` of individual views — `App.vue`'s `<main>` is the single source of truth for page width.

---

## Safe-Area Insets

`viewport-fit=cover` is set in `index.html`. The `page-x` utility in `style.css` uses `max()` to ensure content is never obscured by device notches or Dynamic Islands:

```css
padding-left: max(1rem, env(safe-area-inset-left));
padding-right: max(1rem, env(safe-area-inset-right));
```

On non-notched devices `env(safe-area-inset-*)` resolves to `0`, so the standard padding applies.

---

## Page Headers

All views with a heading + action button use the stacked-on-mobile / inline-on-sm pattern:

```html
<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
  <h1 …>Page Title</h1>
  <button …>Primary Action</button>
</div>
```

At 375 px the heading and button stack vertically. At `sm` (640 px+) they sit on one line.

---

## Modals

All modal inner containers include `mx-4` so the dialog never runs edge-to-edge on narrow screens:

```html
<div class="… w-full max-w-lg mx-4 …">
```

`max-w-lg` prevents the modal from growing too wide on desktop; `w-full mx-4` ensures it never overflows the viewport on mobile.

---

## Tables

Data tables are wrapped in `overflow-x-auto` to allow horizontal scrolling within their card rather than causing full-page overflow. This is intentional for dense tabular data. Responsive card-based layouts for individual table views are tracked in #195–#198.
