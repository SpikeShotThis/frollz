# Playwright Locator Policy

## Goal
Write E2E tests that are stable across UI refactors and reflect how users interact with the app.

## Locator Priority
Use locators in this order:

1. `getByRole(...)` with accessible name
2. `getByLabel(...)` for form inputs
3. `getByText(...)` for user-visible content assertions
4. `getByTestId(...)` only when semantics are missing or ambiguous

Avoid CSS/XPath selectors for behavior tests unless no semantic locator is practical.

## Quasar Notes
Quasar components (for example `QInput`) may not render DOM structure like plain HTML inputs.

- Do not assume nested native elements (for example `.locator('input')` chained from a wrapper).
- Prefer `getByLabel('Email')` / `getByRole('textbox', { name: 'Email' })` for fields.
- If a test id is required on the native input, pass it explicitly with `input-attrs`:

```vue
<q-input :input-attrs="{ 'data-testid': 'login-email' }" />
```

## Examples
Use:

```ts
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password').fill(password);
await page.getByRole('button', { name: /sign in/i }).click();
```

Avoid:

```ts
await page.getByTestId('login-email').locator('input').fill(email);
```
