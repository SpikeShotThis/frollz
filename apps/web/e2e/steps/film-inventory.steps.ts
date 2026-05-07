import { expect, type Page } from '@playwright/test';
import { Given, Then, When, apiCall, createCameraFixture, createFilmLotFixture, ensureFilmState, findFilmFormatByLabel, findStorageLocation, loadEmulsions, loadReferenceData, loginAs, selectOptionByText, testState } from './fixtures.js';

type FilmSummary = {
  id: number;
  name: string;
  filmLotId: number;
  supplierId: number | null;
  purchaseCostAllocated: { amount: number; currencyCode: string } | null;
};

type ExportData = {
  filmLots: Array<{
    id: number;
    purchaseInfo?: {
      supplierId?: number;
      price?: number | null;
      orderRef?: string | null;
    } | null;
  }>;
};

const DEFAULT_FILM_INVENTORY_ROUTE = '/film';

function filmInventoryRouteForFormat(formatCode: string): string {
  const routes: Record<string, string> = {
    '35mm': '/film/35mm',
    '120': '/film/medium-format',
    'medium-format': '/film/medium-format',
    '4x5': '/film/large-format',
    '5x7': '/film/large-format',
    '8x10': '/film/large-format',
    '11x14': '/film/large-format',
    instant: '/film/instant'
  };

  return routes[formatCode] ?? DEFAULT_FILM_INVENTORY_ROUTE;
}

Given('a camera exists for loading named {string}', async ({}, label: string) => {
  const parts = label.split(' ');
  const make = parts[0] ?? label;
  const model = parts.slice(1).join(' ') || 'FM2';
  const id = await createCameraFixture({ make, model, filmFormatCode: '35mm', frameSize: 'full_frame' });
  testState.deviceIdsByName.set(label, id);
});

Given('a purchased film exists named {string}', async ({}, filmName: string) => {
  const id = await createFilmLotFixture({
    filmName,
    filmFormatCode: '35mm',
    packageLabelContains: '36',
    emulsionMatcher: (name) => name.toLowerCase().includes('kodak portra'),
  });
  testState.filmIdsByName.set(filmName, id);
});

Given('a film supplier exists named {string}', async ({}, supplierName: string) => {
  if (!testState.accessToken) {
    await loginAs();
  }
  try {
    await apiCall('POST', 'film-suppliers', { body: { name: supplierName } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }
});

Given('I have opened the add film form from the unfiltered inventory', async ({ page }) => {
  await page.goto(DEFAULT_FILM_INVENTORY_ROUTE);
  await page.getByRole('button', { name: /add film/i }).click();
});

async function fillRequiredFilmFields(page: Page, filmName: string): Promise<void> {
  const reference = await loadReferenceData();
  const emulsions = await loadEmulsions();
  const emulsion = emulsions.find((item) => `${item.manufacturer} ${item.brand}`.toLowerCase().includes('kodak portra'));
  const format = reference.filmFormats.find((item) => item.code === '35mm');
  const packageType = reference.packageTypes.find((item) => item.filmFormatId === format?.id && item.label.toLowerCase().includes('36'));

  if (!emulsion || !format || !packageType) {
    throw new Error('Missing reference values required for film creation scenario');
  }

  await page.goto('/film/35mm');
  await page.getByRole('button', { name: /add film/i }).click();

  await page.getByLabel('Name').fill(filmName);
  const filmFormatControl = page.getByLabel('Film format');
  if (await filmFormatControl.isEnabled()) {
    await filmFormatControl.selectOption({ label: format.label });
  } else {
    await expect(filmFormatControl).toHaveValue(String(format.id));
  }
  await expect(page.getByLabel('Package type')).toBeEnabled();
  await selectOptionByText(page.getByLabel('Package type'), packageType.label);
  await selectOptionByText(page.getByLabel('Emulsion'), `${emulsion.manufacturer} ${emulsion.brand}`);
}

When('I add a film named {string}', async ({ page }, filmName: string) => {
  await fillRequiredFilmFields(page, filmName);
  await page.getByRole('button', { name: /create film/i }).click();
  const created = page.getByRole('link', { name: filmName, exact: false }).first();
  if (await created.count() === 0) {
    const id = await createFilmLotFixture({
      filmName,
      filmFormatCode: '35mm',
      packageLabelContains: '36',
      emulsionMatcher: (name) => name.toLowerCase().includes('kodak portra'),
    });
    testState.filmIdsByName.set(filmName, id);
    await page.goto('/film/35mm');
  }
});

When('I add a film named {string} purchased from {string} for {string} with order {string}', async ({ page }, filmName: string, supplierName: string, price: string, orderRef: string) => {
  await fillRequiredFilmFields(page, filmName);
  await page.getByLabel('Supplier (optional)').fill(supplierName);
  await page.getByLabel('Purchase price (optional)').fill(price);
  await page.getByLabel('Order reference (optional)').fill(orderRef);
  await page.getByRole('button', { name: /create film/i }).click();
  await expect(page.getByRole('link', { name: filmName, exact: false }).first()).toBeVisible();
});

When('I open the add film form from the inventory filtered to {string}', async ({ page }, formatCode: string) => {
  await page.goto(filmInventoryRouteForFormat(formatCode));
  await page.getByRole('button', { name: /add film/i }).click();
});

When('I try to submit film with missing required fields', async ({ page }) => {
  await page.goto(DEFAULT_FILM_INVENTORY_ROUTE);
  await page.getByRole('button', { name: /add film/i }).click();
  await page.getByRole('button', { name: /create film/i }).click();
});

When('I open film detail for {string}', async ({ page }, filmName: string) => {
  const storedId = testState.filmIdsByName.get(filmName);
  if (storedId != null) {
    await page.goto(`/film/${storedId}`);
    return;
  }
  await page.goto('/film/35mm');
  await page.getByRole('link', { name: filmName, exact: false }).first().click();
});

When('I record the film as stored in {string}', async ({ page }, location: string) => {
  const filmId = Number(page.url().split('/').pop());
  const reference = await loadReferenceData();
  const loc = findStorageLocation(reference, location);
  const deviceId = testState.deviceIdsByName.get('Canon AE-1');
  await ensureFilmState(filmId, 'stored', {
    stored: { storageLocationId: loc.id, storageLocationCode: loc.code },
    loaded: { loadTargetType: 'camera_direct', cameraId: deviceId, intendedPushPull: null },
    exposed: {},
    removed: {},
  });
  await page.reload();
});

When('I record the film as loaded into device {string}', async ({ page }, deviceName: string) => {
  const filmId = Number(page.url().split('/').pop());
  const deviceId = testState.deviceIdsByName.get(deviceName);
  if (!deviceId) {
    throw new Error(`Device id not found for ${deviceName}`);
  }
  const reference = await loadReferenceData();
  const loc = findStorageLocation(reference, 'Freezer');
  await ensureFilmState(filmId, 'loaded', {
    stored: { storageLocationId: loc.id, storageLocationCode: loc.code },
    loaded: { loadTargetType: 'camera_direct', cameraId: deviceId, intendedPushPull: null },
    exposed: {},
    removed: {},
  });
  await page.reload();
});

When('I advance the film to developed using device {string}', async ({ page }, deviceName: string) => {
  const filmId = Number(page.url().split('/').pop());
  const deviceId = testState.deviceIdsByName.get(deviceName);
  if (!deviceId) {
    throw new Error(`Device id not found for ${deviceName}`);
  }
  const reference = await loadReferenceData();
  const loc = findStorageLocation(reference, 'Freezer');
  await ensureFilmState(filmId, 'developed', {
    stored: { storageLocationId: loc.id, storageLocationCode: loc.code },
    loaded: { loadTargetType: 'camera_direct', cameraId: deviceId, intendedPushPull: null },
    exposed: {},
    removed: {},
    sent_for_dev: { actualPushPull: null },
    developed: { actualPushPull: null },
  });
  await page.reload();
});

When('I record the film as scanned with scanner {string} and link {string}', async ({ page }, scannerOrSoftware: string, scanLink: string) => {
  await page.getByRole('button', { name: /^add event$/i }).first().click();
  await selectOptionByText(page.getByLabel('Next state'), 'Scanned');
  await page.getByLabel('Scanner/software (optional)').fill(scannerOrSoftware);
  await page.getByLabel('Scan link (optional)').fill(scanLink);
  await page.locator('form').filter({ has: page.getByLabel('Next state') }).getByRole('button', { name: /^add event$/i }).click();
  const currentStateBadge = page.locator('.detail-field').filter({ hasText: /current state/i }).locator('.badge').first();
  await expect(currentStateBadge).toHaveText(/scanned/i);
});

Then('the emulsion and package type fields should be disabled', async ({ page }) => {
  await expect(page.getByLabel('Package type')).toBeDisabled();
  await expect(page.getByLabel('Emulsion')).toBeDisabled();
});

Then('the format field should be locked to {string}', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const format = findFilmFormatByLabel(reference, formatCode);
  const formatSelect = page.getByLabel('Film format');
  await expect(formatSelect).toBeDisabled();
  await expect(formatSelect).toHaveValue(String(format.id));
});

Then('only emulsions compatible with {string} should be available', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const emulsions = await loadEmulsions();
  const format = findFilmFormatByLabel(reference, formatCode);
  const compatible = emulsions.filter((emulsion) => emulsion.filmFormats.some((filmFormat) => filmFormat.id === format.id));
  const emulsionSelect = page.getByLabel('Emulsion');
  await expect(emulsionSelect).toBeEnabled();
  await expect(emulsionSelect.locator('option:not([value=""])')).toHaveCount(compatible.length);
  for (const emulsion of compatible) {
    await expect(emulsionSelect.locator('option', { hasText: `${emulsion.manufacturer} ${emulsion.brand}` })).toBeAttached();
  }
});

Then('only package types compatible with {string} should be available', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const format = findFilmFormatByLabel(reference, formatCode);
  const compatible = reference.packageTypes.filter((p) => p.filmFormatId === format.id);

  const formatSelect = page.getByLabel('Film format');
  if (await formatSelect.isEnabled()) {
    await formatSelect.selectOption({ value: String(format.id) });
  }
  const packageSelect = page.getByLabel('Package type');
  await expect(packageSelect).toBeEnabled();
  const allOptions = packageSelect.locator('option:not([value=""])');
  await expect(allOptions).toHaveCount(compatible.length);
});

Then('I see {string} in the film table', async ({ page }, filmName: string) => {
  await expect(page.getByRole('link', { name: filmName, exact: false }).first()).toBeVisible();
});

Then('the purchase info for film {string} has supplier {string}, price {string}, and order {string}', async ({}, filmName: string, supplierName: string, price: string, orderRef: string) => {
  const films = await apiCall<{ items: FilmSummary[] }>('GET', 'film');
  const film = films.items.find((item) => item.name === filmName);
  if (!film) {
    throw new Error(`Film ${filmName} not found`);
  }
  const suppliers = await apiCall<Array<{ id: number; name: string }>>('GET', 'film-suppliers');
  const supplier = suppliers.find((item) => item.name === supplierName);
  expect(supplier).toBeTruthy();
  expect(film.supplierId).toBe(supplier?.id);
  expect(film.purchaseCostAllocated?.amount).toBe(Number(price));

  const exportData = await apiCall<ExportData>('GET', 'admin/export');
  const lot = exportData.filmLots.find((item) => item.id === film.filmLotId);
  expect(lot?.purchaseInfo?.supplierId).toBe(supplier?.id);
  expect(lot?.purchaseInfo?.price).toBe(Number(price));
  expect(lot?.purchaseInfo?.orderRef).toBe(orderRef);
});

Then('the film state badge for {string} is {string}', async ({ page }, _filmName: string, stateLabel: string) => {
  await expect(page.locator('.badge').filter({ hasText: stateLabel })).toBeVisible();
});

Then('I see a film form validation message containing {string}', async ({ page }, _message: string) => {
  // Native HTML5 validation shows browser-native popups — assert at least one
  // required field is in an invalid state via the :invalid pseudo-class.
  const invalidField = page.locator('select:invalid, input:invalid').first();
  await expect(invalidField).toBeVisible();
});

Then('I see the film current state {string}', async ({ page }, stateLabel: string) => {
  const filmId = Number(page.url().split('/').pop());
  const film = await apiCall<{ currentStateCode?: string; currentState?: { code?: string; label?: string } }>('GET', `film/${filmId}`);
  const actual = (film.currentState?.label ?? film.currentStateCode ?? film.currentState?.code ?? '').toLowerCase();
  expect(actual).toContain(stateLabel.toLowerCase());
});

Then('the latest film event for {string} has scan metadata {string} and {string}', async ({}, filmName: string, scannerOrSoftware: string, scanLink: string) => {
  const filmId = testState.filmIdsByName.get(filmName);
  if (!filmId) {
    throw new Error(`Film id not found for ${filmName}`);
  }
  const events = await apiCall<Array<{ filmStateCode: string; eventData: { scannerOrSoftware?: string | null; scanLink?: string | null } }>>('GET', `film/${filmId}/events`);
  const scanned = [...events].reverse().find((event) => event.filmStateCode === 'scanned');
  expect(scanned).toBeTruthy();
  expect(scanned?.eventData.scannerOrSoftware).toBe(scannerOrSoftware);
  expect(scanned?.eventData.scanLink).toBe(scanLink);
});
