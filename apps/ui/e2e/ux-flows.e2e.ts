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
    filmFormats: [{ id: 1, code: '35mm', label: '35mm' }],
    developmentProcesses: [{ id: 1, code: 'C41', label: 'C-41' }],
    packageTypes: [{ id: 1, filmFormatId: 1, code: 'roll', label: 'Roll', filmFormat: { id: 1, code: '35mm', label: '35mm' } }],
    filmStates: [
      { id: 1, code: 'purchased', label: 'Purchased' },
      { id: 2, code: 'stored', label: 'Stored' },
      { id: 3, code: 'loaded', label: 'Loaded' }
    ],
    storageLocations: [{ id: 1, code: 'refrigerator', label: 'Refrigerator' }],
    slotStates: [{ id: 1, code: 'empty', label: 'Empty' }],
    deviceTypes: [{ id: 1, code: 'camera', label: 'Camera' }],
    holderTypes: [{ id: 1, code: 'standard', label: 'Standard' }],
    emulsions: [
      {
        id: 1,
        manufacturer: 'Kodak',
        brand: 'Portra',
        isoSpeed: 400,
        developmentProcessId: 1,
        developmentProcess: { id: 1, code: 'C41', label: 'C-41' },
        balance: 'Daylight',
        filmFormats: [{ id: 1, code: '35mm', label: '35mm' }]
      }
    ]
  }
};

const authTokenResponse = { data: { accessToken: 'access-token', refreshToken: 'refresh-token' } };
const authUserResponse = { data: { id: 1, email: 'ux@example.com', name: 'UX User', createdAt: '2026-01-01T00:00:00.000Z' } };
const defaultPassword = 'good-password';

async function fillLoginForm(page: Page, password: string): Promise<void> {
  await page.locator('[data-testid="login-email"] input').fill(authUserResponse.data.email);
  await page.locator('[data-testid="login-password"] input').fill(password);
}

async function stubReference(page: Page, payload: unknown = referencePayload): Promise<void> {
  await page.route('**/api/v1/reference', async (route) => {
    await route.fulfill({ json: payload });
  });
}

async function stubEmptyFilms(page: Page): Promise<void> {
  await page.route('**/api/v1/film*', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });
}

async function stubEmptyDevices(page: Page): Promise<void> {
  await page.route('**/api/v1/devices*', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });
}

async function mockLogin(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: authTokenResponse });
  });
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ json: authTokenResponse });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: authUserResponse });
  });
}

async function loginThroughUi(page: Page): Promise<void> {
  await page.goto('/login');
  await fillLoginForm(page, defaultPassword);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard/);
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

    await route.fulfill({ json: authTokenResponse });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: authUserResponse });
  });

  await stubReference(page);
  await stubEmptyFilms(page);

  await page.goto('/login');
  await fillLoginForm(page, 'wrong-password');
  await page.getByTestId('login-submit').click();

  await expect(page.getByText(/Invalid credentials/i)).toBeVisible();

  await page.locator('[data-testid="login-password"] input').fill(defaultPassword);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('film create flow validates required fields from dashboard create action', async ({ page }) => {
  await mockLogin(page);

  const films: FilmSummary[] = [];

  await stubReference(page);

  await page.route('**/api/v1/film*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string };
      const createdFilm: FilmSummary = {
        id: 1,
        name: body.name,
        currentStateCode: 'purchased',
        currentState: { code: 'purchased', label: 'Purchased' },
        emulsion: { manufacturer: 'Kodak', brand: 'Portra', isoSpeed: 400 },
        filmFormat: { code: '35mm' },
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
  await page.goto('/film');

  await page.getByRole('button', { name: 'Add film' }).click();
  await page.getByRole('button', { name: 'Create film' }).click();

  await expect(page.getByText('Please complete all required fields.')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Please complete all required fields.')).not.toBeVisible();
});

test('event composer opens from inventory and supports conditional fields', async ({ page }) => {
  await mockLogin(page);

  await stubReference(page);

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
            eventData: { storageLocationCode: 'refrigerator' }
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
            filmFormat: { id: 1, code: '35mm', label: '35mm' },
            packageType: { id: 1, filmFormatId: 1, code: 'roll', label: 'Roll', filmFormat: { id: 1, code: '35mm', label: '35mm' } },
            emulsion: {
              id: 1,
              manufacturer: 'Kodak',
              brand: 'Portra',
              isoSpeed: 400,
              developmentProcessId: 1,
              developmentProcess: { id: 1, code: 'C41', label: 'C-41' },
              balance: 'Daylight',
              filmFormats: [{ id: 1, code: '35mm', label: '35mm' }]
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
              developmentProcess: { id: 1, code: 'C41', label: 'C-41' },
              balance: 'Daylight',
              filmFormats: [{ id: 1, code: '35mm', label: '35mm' }]
            },
            filmFormat: { id: 1, code: '35mm', label: '35mm' },
            packageType: { id: 1, filmFormatId: 1, code: 'roll', label: 'Roll', filmFormat: { id: 1, code: '35mm', label: '35mm' } }
          }
        ]
      }
    });
  });

  await page.route('**/api/v1/devices', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });

  await loginThroughUi(page);
  await page.goto('/film/1');
  await page.getByRole('button', { name: 'Add transition event' }).click();
  await expect(page.getByRole('heading', { name: 'Add journey event' })).toBeVisible();
  await expect(page.getByTestId('event-target-state')).toBeVisible();
});

test('mini dashboards render recent tail-window lists and stats cards', async ({ page }) => {
  await mockLogin(page);

  const expandedReferencePayload = {
    data: {
      filmFormats: [{ id: 1, code: '35mm', label: '35mm' }],
      developmentProcesses: [
        { id: 1, code: 'C41', label: 'C-41' },
        { id: 2, code: 'BW', label: 'Black and White' }
      ],
      packageTypes: [{ id: 1, filmFormatId: 1, code: 'roll', label: 'Roll', filmFormat: { id: 1, code: '35mm', label: '35mm' } }],
      filmStates: [
        { id: 1, code: 'purchased', label: 'Purchased' },
        { id: 2, code: 'stored', label: 'Stored' },
        { id: 3, code: 'loaded', label: 'Loaded' },
        { id: 4, code: 'exposed', label: 'Exposed' },
        { id: 5, code: 'sent_for_dev', label: 'Sent for Development' }
      ],
      storageLocations: [{ id: 1, code: 'refrigerator', label: 'Refrigerator' }],
      slotStates: [{ id: 1, code: 'empty', label: 'Empty' }],
      deviceTypes: [
        { id: 1, code: 'camera', label: 'Camera' },
        { id: 2, code: 'interchangeable_back', label: 'Interchangeable back' },
        { id: 3, code: 'film_holder', label: 'Film holder' }
      ],
      holderTypes: [{ id: 1, code: 'standard', label: 'Standard' }],
      emulsions: Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        manufacturer: 'Maker',
        brand: `Stock ${index + 1}`,
        isoSpeed: 100 + index,
        developmentProcessId: index % 2 === 0 ? 1 : 2,
        developmentProcess: index % 2 === 0 ? { id: 1, code: 'C41', label: 'C-41' } : { id: 2, code: 'BW', label: 'Black and White' },
        balance: 'Daylight',
        filmFormats: [{ id: 1, code: '35mm', label: '35mm' }]
      }))
    }
  };

  await stubReference(page, expandedReferencePayload);

  await page.route('**/api/v1/film*', async (route) => {
    await route.fulfill({
      json: {
        data: Array.from({ length: 12 }, (_, index) => ({
          id: index + 1,
          userId: 1,
          name: `Film ${index + 1}`,
          emulsionId: 1,
          packageTypeId: 1,
          filmFormatId: 1,
          expirationDate: null,
          currentStateId: (index % 5) + 1,
          currentStateCode: ['purchased', 'stored', 'loaded', 'exposed', 'sent_for_dev'][index % 5],
          currentState: [
            { id: 1, code: 'purchased', label: 'Purchased' },
            { id: 2, code: 'stored', label: 'Stored' },
            { id: 3, code: 'loaded', label: 'Loaded' },
            { id: 4, code: 'exposed', label: 'Exposed' },
            { id: 5, code: 'sent_for_dev', label: 'Sent for Development' }
          ][index % 5],
          emulsion: expandedReferencePayload.data.emulsions[0],
          filmFormat: { id: 1, code: '35mm', label: '35mm' },
          packageType: { id: 1, filmFormatId: 1, code: 'roll', label: 'Roll', filmFormat: { id: 1, code: '35mm', label: '35mm' } }
        }))
      }
    });
  });

  await page.route('**/api/v1/devices', async (route) => {
    await route.fulfill({
      json: {
        data: Array.from({ length: 11 }, (_, index) => ({
          id: index + 1,
          userId: 1,
          deviceTypeId: 1,
          deviceTypeCode: 'camera',
          filmFormatId: 1,
          frameSize: 'full_frame',
          make: 'Nikon',
          model: `F${index + 1}`,
          loadMode: 'direct',
          canUnload: true,
          cameraSystem: '',
          serialNumber: null,
          dateAcquired: null
        }))
      }
    });
  });

  await loginThroughUi(page);

  await page.goto('/film');
  await expect(page.getByRole('heading', { name: 'Recently added films' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Film statistics' })).toBeVisible();
  await expect(page.getByText(/^Film 12$/)).toBeVisible();
  await expect(page.getByText(/^Film 1$/)).toHaveCount(0);
  await expect(page.getByText('Total visible films')).toBeVisible();

  await page.goto('/devices');
  await expect(page.getByRole('heading', { name: 'Recently added devices' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Device statistics' })).toBeVisible();
  await expect(page.getByText(/^Nikon F11$/)).toBeVisible();
  await expect(page.getByText(/^Nikon F1$/)).toHaveCount(0);
  await expect(page.getByText('Total visible devices')).toBeVisible();

  await page.goto('/emulsions');
  await expect(page.getByRole('heading', { name: 'Recently added emulsions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Emulsion statistics' })).toBeVisible();
  await expect(page.getByText(/Maker Stock 12/)).toHaveCount(1);
  await expect(page.getByText(/Maker Stock 1(?!\d)/)).toHaveCount(0);
  await expect(page.getByText('Total visible emulsions')).toBeVisible();
});

test('device sub-route uses page-centric table and links to device detail', async ({ page }) => {
  await mockLogin(page);

  await stubReference(page, {
    data: {
      ...referencePayload.data,
      filmFormats: [
        { id: 1, code: '35mm', label: '35mm' },
        { id: 2, code: '120', label: '120' },
        { id: 3, code: '4x5', label: '4x5' }
      ],
      deviceTypes: [
        { id: 1, code: 'camera', label: 'Camera' },
        { id: 2, code: 'interchangeable_back', label: 'Interchangeable back' },
        { id: 3, code: 'film_holder', label: 'Film holder' }
      ],
      holderTypes: [{ id: 1, code: 'standard', label: 'Standard' }]
    }
  });

  await page.route('**/api/v1/devices**', async (route) => {
    const url = new URL(route.request().url());

    if (/^\/api\/v1\/devices\/\d+\/load-events$/.test(url.pathname)) {
      await route.fulfill({
        json: {
          data: []
        }
      });
      return;
    }

    if (/^\/api\/v1\/devices\/\d+$/.test(url.pathname)) {
      await route.fulfill({
        json: {
          data: {
            id: 1,
            userId: 1,
            deviceTypeId: 1,
            deviceTypeCode: 'camera',
            filmFormatId: 1,
            frameSize: 'full_frame',
            make: 'Nikon',
            model: 'F3',
            loadMode: 'direct',
            canUnload: true,
            cameraSystem: '',
            serialNumber: null,
            dateAcquired: null
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
            deviceTypeId: 1,
            deviceTypeCode: 'camera',
            filmFormatId: 1,
            frameSize: 'full_frame',
            make: 'Nikon',
            model: 'F3',
            loadMode: 'direct',
            canUnload: true,
            cameraSystem: '',
            serialNumber: null,
            dateAcquired: null
          },
          {
            id: 2,
            userId: 1,
            deviceTypeId: 2,
            deviceTypeCode: 'interchangeable_back',
            filmFormatId: 2,
            frameSize: '6x7',
            name: 'Mamiya RB67 Back',
            system: 'RB67'
          }
        ]
      }
    });
  });

  await stubEmptyFilms(page);

  await loginThroughUi(page);
  await page.goto('/devices/cameras');

  await expect(page.getByRole('heading', { name: 'Devices in this category' })).toBeVisible();
  await expect(page.getByTestId('devices-child-search')).toBeVisible();
  await expect(page.getByTestId('devices-child-table')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nikon F3' })).toBeVisible();
  await expect(page.getByText('Mamiya RB67 Back RB67')).toHaveCount(0);

  await page.getByRole('link', { name: 'Nikon F3' }).click();
  await expect(page).toHaveURL(/\/devices\/1$/);
  await expect(page.getByRole('heading', { name: 'Device Detail', exact: true })).toBeVisible();
  await expect(page.getByText('Nikon F3')).toBeVisible();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/devices\/cameras$/);
});

test('emulsion sub-route uses page-centric table and links to emulsion detail', async ({ page }) => {
  await mockLogin(page);

  const emulsions = [
    {
      id: 1,
      manufacturer: 'Kodak',
      brand: 'Gold',
      isoSpeed: 200,
      developmentProcessId: 1,
      developmentProcess: { id: 1, code: 'C41', label: 'C-41' },
      balance: 'Daylight',
      filmFormats: [{ id: 1, code: '35mm', label: '35mm' }]
    },
    {
      id: 2,
      manufacturer: 'Ilford',
      brand: 'HP5',
      isoSpeed: 400,
      developmentProcessId: 2,
      developmentProcess: { id: 2, code: 'BW', label: 'Black and White' },
      balance: 'Daylight',
      filmFormats: [{ id: 1, code: '35mm', label: '35mm' }]
    }
  ];

  await page.route('**/api/v1/reference**', async (route) => {
    const url = new URL(route.request().url());

    if (/^\/api\/v1\/reference\/emulsions\/\d+$/.test(url.pathname)) {
      await route.fulfill({ json: { data: emulsions[0] } });
      return;
    }

    await route.fulfill({
      json: {
        data: {
          ...referencePayload.data,
          developmentProcesses: [
            { id: 1, code: 'C41', label: 'C-41' },
            { id: 2, code: 'BW', label: 'Black and White' }
          ],
          emulsions
        }
      }
    });
  });

  await stubEmptyFilms(page);
  await stubEmptyDevices(page);

  await loginThroughUi(page);
  await page.goto('/emulsions/color-negative-c41');

  await expect(page.getByRole('heading', { name: 'Emulsions in this process' })).toBeVisible();
  await expect(page.getByTestId('emulsions-child-search')).toBeVisible();
  await expect(page.getByTestId('emulsions-child-table')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kodak Gold' })).toBeVisible();
  await expect(page.getByText('Ilford HP5')).toHaveCount(0);

  await page.getByRole('link', { name: 'Kodak Gold' }).click();
  await expect(page).toHaveURL(/\/emulsions\/1$/);
  await expect(page.getByRole('heading', { name: 'Emulsion Detail' })).toBeVisible();
  await expect(page.getByText('Compatible formats')).toBeVisible();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/emulsions\/color-negative-c41$/);
});

test('mobile navigation uses drawer menu', async ({ page }) => {
  await mockLogin(page);

  await stubReference(page);
  await stubEmptyFilms(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginThroughUi(page);

  const menuButton = page.getByRole('button', { name: 'Menu' });
  await expect(menuButton).toBeVisible();
  const menuButtonBox = await menuButton.boundingBox();
  expect(menuButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(menuButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await menuButton.click();
  await expect(page.getByText('Navigation')).toBeVisible();

  const closeButton = page.locator('.n-drawer .n-base-close').first();
  await expect(closeButton).toBeVisible();
  const closeButtonBox = await closeButton.boundingBox();
  expect(closeButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(closeButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  const drawerBody = page.locator('.n-drawer-body-content-wrapper').first();
  const drawerBox = await drawerBody.boundingBox();
  expect(drawerBox?.width ?? 9999).toBeLessThanOrEqual(390);
});

test('layouts expose one main landmark in auth and app routes', async ({ page }) => {
  await mockLogin(page);
  await stubReference(page);
  await stubEmptyFilms(page);

  await page.goto('/login');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('main#auth-main-content')).toHaveCount(1);

  await loginThroughUi(page);
  await page.goto('/film');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('main#app-main-content')).toHaveCount(1);
});

test('route entry performs one bootstrap fetch per dataset', async ({ page }) => {
  await mockLogin(page);

  let referenceRequests = 0;
  let filmRequests = 0;
  let deviceRequests = 0;

  await page.route('**/api/v1/reference', async (route) => {
    referenceRequests += 1;
    await route.fulfill({ json: referencePayload });
  });

  await page.route('**/api/v1/film*', async (route) => {
    filmRequests += 1;
    await route.fulfill({ json: { data: [] } });
  });

  await page.route('**/api/v1/devices*', async (route) => {
    deviceRequests += 1;
    await route.fulfill({ json: { data: [] } });
  });

  await loginThroughUi(page);

  await page.goto('/film');
  await expect(page.getByRole('heading', { name: 'Film Inventory' })).toBeVisible();
  expect(referenceRequests).toBe(1);
  await expect.poll(() => filmRequests).toBe(1);

  await page.goto('/devices');
  await expect(page.getByRole('heading', { name: 'Devices', exact: true })).toBeVisible();
  await expect.poll(() => deviceRequests).toBe(1);
});

test('refresh failure gracefully routes to login without hard reload', async ({ page }) => {
  await mockLogin(page);

  await page.route('**/api/v1/reference', async (route) => {
    await route.fulfill({
      status: 401,
      json: { error: { message: 'Unauthorized' } }
    });
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      json: { error: { message: 'Refresh token expired' } }
    });
  });

  await stubEmptyFilms(page);

  await loginThroughUi(page);
  await page.goto('/film');
  await expect(page).toHaveURL(/\/login$/);
});
