# playwright-bdd Setup Guide

## Overview
The UI app now supports Gherkin/BDD syntax via `playwright-bdd` (v8.5.0). This allows you to write test scenarios in human-readable `.feature` files with step definitions in TypeScript.

## Architecture

### Three Playwright Projects
- **`e2e`** — Traditional Playwright tests (`.e2e.ts` files). Unchanged from before.
- **`bdd-gen`** — Scans `.feature` files and generates test wrappers into `.features-gen/` directory.
- **`bdd`** — Runs the generated test wrappers. Depends on `bdd-gen`.

### Directory Structure
```
apps/ui/
├── e2e/
│   ├── features/                    # .feature files organized by domain
│   │   └── auth/
│   │       └── login.feature
│   ├── steps/                       # Step definition files
│   │   ├── fixtures.ts              # Shared fixtures + createBdd export
│   │   ├── auth.steps.ts            # Step definitions for auth domain
│   │   └── ... (more .steps.ts files)
│   └── ux-flows.e2e.ts              # Traditional e2e tests (unchanged)
├── .features-gen/                   # Generated (runtime only, .gitignore'd)
└── playwright.config.ts             # Config with three projects
```

## Writing BDD Tests

### 1. Create a Feature File
```gherkin
# e2e/features/film/create-film.feature
Feature: Film Creation

  Scenario: Create new film with valid data
    Given I am logged in
    And I am on the film inventory page
    When I click "Add Film" button
    And I fill in the create film form with valid data
    And I submit the form
    Then a new film should appear in the inventory list
    And the film should show "purchased" state
```

### 2. Create Step Definitions
```ts
// e2e/steps/film.steps.ts
import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures.js';

Given('I am on the film inventory page', async ({ page }) => {
  await page.goto('/film');
  await expect(page.locator('[data-testid="film-list"]')).toBeVisible();
});

When('I click "Add Film" button', async ({ page }) => {
  await page.getByRole('button', { name: /Add Film/i }).click();
});

// ... more steps ...
```

**Important:** Always use `.js` extension on relative imports due to `"moduleResolution": "NodeNext"`:
```ts
import { Given, When, Then } from './fixtures.js';  // ✓ Correct
import { Given, When, Then } from './fixtures';    // ✗ Wrong
```

### 3. Using Shared Fixtures
The `fixtures.ts` file exports a custom `test` object with fixtures. Access them in step definitions:

```ts
import { Given } from './fixtures.js';

Given('I am logged in', async ({ page, mockAuth }) => {
  // mockAuth fixture automatically registers auth route mocks
  await page.goto('/login');
  await page.getByTestId('login-email').locator('input').fill('demo@example.com');
  await page.getByTestId('login-password').locator('input').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

Available fixtures:
- `page` — standard Playwright Page object
- `mockAuth` — registers auth API mocks (login, refresh, me)

### 4. Adding Custom Fixtures
Extend `fixtures.ts` to add domain-specific fixtures:

```ts
// e2e/steps/fixtures.ts
import { test as base } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

export const test = base.extend<{ mockAuth: void; mockFilmApi: void }>({
  mockAuth: async ({ page }, use) => {
    // ... auth mocks ...
    await use();
  },
  mockFilmApi: async ({ page }, use) => {
    await page.route('**/api/v1/film', (route) =>
      route.fulfill({ json: { data: [] } })
    );
    await use();
  }
});

export const { Given, When, Then } = createBdd(test);
```

Then use it:
```ts
Given('I have an empty film library', async ({ page, mockFilmApi }) => {
  // mockFilmApi fixture is ready
});
```

## Running Tests

### Run all tests (e2e + bdd)
```bash
pnpm test:e2e
```

### Run only traditional e2e tests
```bash
pnpm test:e2e -- --project=e2e
```

### Run only BDD tests
```bash
pnpm test:e2e -- --project=bdd
```

### Run BDD tests with UI
```bash
pnpm test:e2e:ui -- --project=bdd
```

### Run specific feature file
```bash
pnpm test:e2e -- --grep "Film Creation"
```

## How It Works

1. `pnpm test:e2e` runs playwright with the config
2. Playwright first executes the `bdd-gen` project
3. `bdd-gen` scans `e2e/features/**/*.feature` files
4. For each feature, it parses the Gherkin syntax
5. It matches each step against the regex patterns in `e2e/steps/**/*.ts`
6. It generates wrapper test files into `.features-gen/` (each scenario becomes a test)
7. The `bdd` project then runs the generated wrappers
8. Meanwhile, the `e2e` project runs traditional `.e2e.ts` files in parallel

## Step Definition Matching

playwright-bdd matches step text to step definitions using regex:

```ts
Given('I am on the login page', async ({ page }) => {
  // Matches: "Given I am on the login page"
});

When('I enter valid credentials', async ({ page }) => {
  // Matches: "When I enter valid credentials"
});

When('I fill in the {word} field with {string}', async ({ page }, field, value) => {
  // Matches: "When I fill in the email field with test@example.com"
  // Captures: field="email", value="test@example.com"
});
```

### Parameter Types
- `{word}` — single word (no spaces)
- `{string}` — quoted string ("hello world")
- `{int}` — integer (42)
- `{float}` — decimal (3.14)

```ts
When('I create {int} films', async ({ page }, count) => {
  // count is a number, not a string
});
```

## Organizing Steps

### By Domain
Group steps by feature domain:

```
e2e/steps/
├── auth.steps.ts        # Login, register, logout
├── film.steps.ts        # Create, list, detail, delete
├── receiver.steps.ts    # Camera, film holder, interchangeable back
└── common.steps.ts      # Shared: navigation, assertions
```

### Sharing Across Domains
For common steps, define them once in `common.steps.ts`:

```ts
// e2e/steps/common.steps.ts
Then('I see an error message saying {string}', async ({ page }, message) => {
  const errorLocator = page.locator('[role="alert"]');
  await expect(errorLocator).toContainText(message);
});
```

All `.steps.ts` files are scanned by playwright-bdd, so this step is available everywhere.

## TypeScript Configuration

The `e2e/` directory is **not** included in `tsconfig.json` — Playwright transpiles it independently using its own TypeScript compiler. This means:
- Changes to `e2e/` files don't affect `pnpm check-types` output
- No build step needed — Playwright handles it
- `.js` extensions are required in imports due to `"moduleResolution": "NodeNext"`

## Debugging

### View Generated Tests
After running `pnpm test:e2e`, inspect `.features-gen/` to see generated test wrappers:

```bash
cat apps/ui/.features-gen/features/auth/login.spec.ts
```

### Run Single Scenario
```bash
pnpm test:e2e -- --grep "Successful login redirects to dashboard"
```

### Debug Mode
```bash
pnpm test:e2e -- --debug
```

Opens Playwright Inspector with step-by-step execution.

### Headed Mode
```bash
pnpm test:e2e -- --headed
```

Watch tests run in a visible browser window.

## Migrating from e2e.ts to BDD

You can run both formats in parallel. Gradually convert scenarios:

1. Keep existing `.e2e.ts` tests as-is
2. Write new tests as `.feature` files
3. Delete `.e2e.ts` tests once equivalent `.feature` tests pass

Example: Convert `ux-flows.e2e.ts` auth tests to BDD:

**Before (e2e.ts):**
```ts
test('successful login', async ({ page }) => {
  await mockLogin(page);
  await page.goto('/login');
  await page.getByTestId('login-email').locator('input').fill('demo@example.com');
  await page.getByTestId('login-password').locator('input').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

**After (BDD):**
```gherkin
Feature: User Authentication
  Scenario: Successful login redirects to dashboard
    Given I am on the login page
    When I enter valid credentials
    Then I should be on the dashboard
```

With steps in `auth.steps.ts`.

## Resources
- [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd/)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/)
- [Playwright Docs](https://playwright.dev/)
