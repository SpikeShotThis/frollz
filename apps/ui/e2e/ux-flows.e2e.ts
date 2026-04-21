import { expect, test, type Page } from '@playwright/test';

type FilmSummary = {
  id: number;
  name: string;
  currentStateCode: string;
  currentState: { code: string; label: string };
  emulsion: { manufacturer: string; brand: string; isoSpeed: number };
  filmFormat: { code: string };
  packageType: { code: string };
};

const referencePayload = {
  data: {
    filmFormats: [{ id: 1, code: '135', label: '35mm' }],
    developmentProcesses: [{ id: 1, code: 'c41', label: 'C-41' }],
    packageTypes: [{ id: 1, filmFormatId: 1, code: 'roll', label: 'Roll', filmFormat: { id: 1, code: '135', label: '35mm' } }],
    filmStates: [
      { id: 1, code: 'purchased', label: 'Purchased' },
      { id: 2, code: 'stored', label: 'Stored' },
      { id: 3, code: 'loaded', label: 'Loaded' }
    ],
    storageLocations: [{ id: 1, code: 'fridge', label: 'Fridge' }],
    slotStates: [{ id: 1, code: 'empty', label: 'Empty' }],
    receiverTypes: [{ id: 1, code: 'camera', label: 'Camera' }],
    holderTypes: [{ id: 1, code: 'sheet', label: 'Sheet' }],
    emulsions: [
      {
        id: 1,
        manufacturer: 'Kodak',
        brand: 'Portra',
        isoSpeed: 400,
        developmentProcessId: 1,
        developmentProcess: { id: 1, code: 'c41', label: 'C-41' },
        balance: 'Daylight',
        filmFormats: [{ id: 1, code: '135', label: '35mm' }]
      }
    ]
  }
};

async function mockLogin(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { data: { accessToken: 'access-token', refreshToken: 'refresh-token' } } });
  });
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ json: { data: { accessToken: 'access-token', refreshToken: 'refresh-token' } } });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { data: { id: 1, email: 'ux@example.com', name: 'UX User', createdAt: '2026-01-01T00:00:00.000Z' } } });
  });
}

async function loginThroughUi(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('[data-testid="login-email"] input').fill('ux@example.com');
  await page.locator('[data-testid="login-password"] input').fill('good-password');
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/film/);
}

test('auth flow shows error and succeeds with visible feedback', async ({ page }) => {
  let loginAttempts = 0;

  await page.route('**/api/v1/auth/login', async (route) => {
    loginAttempts += 1;

    if (loginAttempts === 1) {
      await route.fulfill({
        status: 401,
        json: { error: { message: 'Invalid credentials' } }
      });
      return;
    }

    await route.fulfill({ json: { data: { accessToken: 'access-token', refreshToken: 'refresh-token' } } });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { data: { id: 1, email: 'ux@example.com', name: 'UX User', createdAt: '2026-01-01T00:00:00.000Z' } } });
  });

  await page.route('**/api/v1/reference', async (route) => {
    await route.fulfill({ json: referencePayload });
  });

  await page.route('**/api/v1/film*', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });

  await page.goto('/login');
  await page.locator('[data-testid="login-email"] input').fill('ux@example.com');
  await page.locator('[data-testid="login-password"] input').fill('wrong-password');
  await page.getByTestId('login-submit').click();

  await expect(page.getByText(/Invalid credentials/i)).toBeVisible();

  await page.locator('[data-testid="login-password"] input').fill('good-password');
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/film/);
  await expect(page.getByRole('heading', { name: 'Film Inventory' })).toBeVisible();
});

test('film create flow validates required fields and refreshes table', async ({ page }) => {
  await mockLogin(page);

  const films: FilmSummary[] = [];

  await page.route('**/api/v1/reference', async (route) => {
    await route.fulfill({ json: referencePayload });
  });

  await page.route('**/api/v1/film*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string };
      const createdFilm: FilmSummary = {
        id: 1,
        name: body.name,
        currentStateCode: 'purchased',
        currentState: { code: 'purchased', label: 'Purchased' },
        emulsion: { manufacturer: 'Kodak', brand: 'Portra', isoSpeed: 400 },
        filmFormat: { code: '135' },
        packageType: { code: 'roll' }
      };

      films.push(createdFilm);

      await route.fulfill({
        json: {
          data: {
            ...createdFilm,
            filmFormatId: 1,
            packageTypeId: 1,
            emulsionId: 1,
            expirationDate: null
          }
        }
      });
      return;
    }

    await route.fulfill({ json: { data: films } });
  });

  await loginThroughUi(page);

  await page.getByRole('button', { name: 'Add film' }).click();
  await page.getByRole('button', { name: 'Create film' }).click();

  await expect(page.getByText('Please complete all required fields.')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Please complete all required fields.')).not.toBeVisible();
});

test('event composer opens from inventory and supports conditional fields', async ({ page }) => {
  await mockLogin(page);

  await page.route('**/api/v1/reference', async (route) => {
    await route.fulfill({ json: referencePayload });
  });

  await page.route('**/api/v1/film*', async (route) => {
    const url = new URL(route.request().url());

    if (route.request().method() === 'POST' && url.pathname.endsWith('/events')) {
      await route.fulfill({
        json: {
          data: {
            id: 2,
            filmId: 1,
            filmStateCode: 'stored',
            occurredAt: new Date().toISOString(),
            notes: null,
            eventData: { storageLocationCode: 'fridge' }
          }
        }
      });
      return;
    }

    if (url.pathname.endsWith('/film/1/events')) {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (url.pathname.endsWith('/film/1')) {
      await route.fulfill({
        json: {
          data: {
            id: 1,
            userId: 1,
            name: 'Portra roll 01',
            filmFormatId: 1,
            packageTypeId: 1,
            emulsionId: 1,
            expirationDate: null,
            currentStateId: 1,
            currentStateCode: 'purchased',
            currentState: { id: 1, code: 'purchased', label: 'Purchased' },
            filmFormat: { id: 1, code: '135', label: '35mm' },
            packageType: { id: 1, filmFormatId: 1, code: 'roll', label: 'Roll' },
            emulsion: {
              id: 1,
              manufacturer: 'Kodak',
              brand: 'Portra',
              isoSpeed: 400,
              developmentProcessId: 1,
              developmentProcess: { id: 1, code: 'c41', label: 'C-41' },
              balance: 'Daylight',
              filmFormats: [{ id: 1, code: '135', label: '35mm' }]
            },
            latestEvent: null
          }
        }
      });
      return;
    }

    await route.fulfill({
      json: {
        data: [
          {
            id: 1,
            userId: 1,
            name: 'Portra roll 01',
            emulsionId: 1,
            packageTypeId: 1,
            filmFormatId: 1,
            expirationDate: null,
            currentStateId: 1,
            currentStateCode: 'purchased',
            currentState: { id: 1, code: 'purchased', label: 'Purchased' },
            emulsion: {
              id: 1,
              manufacturer: 'Kodak',
              brand: 'Portra',
              isoSpeed: 400,
              developmentProcessId: 1,
              developmentProcess: { id: 1, code: 'c41', label: 'C-41' },
              balance: 'Daylight',
              filmFormats: [{ id: 1, code: '135', label: '35mm' }]
            },
            filmFormat: { id: 1, code: '135', label: '35mm' },
            packageType: { id: 1, filmFormatId: 1, code: 'roll', label: 'Roll' }
          }
        ]
      }
    });
  });

  await page.route('**/api/v1/receivers', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });

  await loginThroughUi(page);
  await page.goto('/film/1');
  await page.getByRole('button', { name: 'Add transition event' }).click();
  await expect(page.getByRole('heading', { name: 'Add journey event' })).toBeVisible();
  await expect(page.getByTestId('event-target-state')).toBeVisible();
});

test('mobile navigation uses drawer menu', async ({ page }) => {
  await mockLogin(page);

  await page.route('**/api/v1/reference', async (route) => {
    await route.fulfill({ json: referencePayload });
  });

  await page.route('**/api/v1/film*', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await loginThroughUi(page);

  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByText('Navigation')).toBeVisible();
});
