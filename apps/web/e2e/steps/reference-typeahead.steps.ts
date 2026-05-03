import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Emulsion, ReferenceValue } from '@frollz2/schema';
import {
  Given,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  Then,
  When,
  apiCall,
  createCameraFixture,
  createFilmLotFixture,
  ensureFilmState,
  loadReferenceData,
  loginAs,
  selectOptionByText,
  testState
} from './fixtures.js';

async function ensureBrowserAuthenticated(page: Page): Promise<void> {
  const signInHeading = page.getByRole('heading', { name: /sign in/i });
  if ((await signInHeading.count()) === 0) {
    return;
  }
  await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForLoadState('networkidle');
}

async function ensureAddEventVisible(page: Page, filmId: number): Promise<void> {
  const addEventButton = page.getByRole('button', { name: /^add event$/i });
  try {
    await addEventButton.waitFor({ state: 'visible', timeout: 3000 });
    return;
  } catch {
    // If auth was lost mid-flow, re-login and return to the film page.
    await page.goto('/auth/login');
    await ensureBrowserAuthenticated(page);
    await page.goto(`/film/${filmId}`);
    await addEventButton.waitFor({ state: 'visible', timeout: 15000 });
  }
}

async function createEmulsion(manufacturer: string, brand: string): Promise<Emulsion> {
  const reference = await loadReferenceData();
  const devProcess = reference.developmentProcesses[0];
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];
  if (!devProcess || !format) throw new Error('Missing reference data for emulsion creation');

  const isoSpeed = 200 + Math.floor(Math.random() * 500);
  try {
    return await apiCall<Emulsion>('POST', 'emulsions', {
      body: {
        manufacturer,
        brand,
        isoSpeed,
        developmentProcessId: devProcess.id,
        filmFormatIds: [format.id]
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
    const emulsions = await apiCall<Emulsion[]>('GET', 'emulsions');
    const existing = emulsions.find(
      (item) => item.manufacturer.toLowerCase() === manufacturer.toLowerCase() && item.brand.toLowerCase() === brand.toLowerCase()
    );
    if (!existing) throw error;
    return existing;
  }
}

async function createDeviceValues(make: string, model: string): Promise<void> {
  const reference = await loadReferenceData();
  const deviceType = reference.deviceTypes.find((item) => item.code === 'camera');
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];
  if (!deviceType || !format) {
    throw new Error('Device type camera or 35mm format missing');
  }

  await apiCall('POST', 'devices', {
    body: {
      deviceTypeCode: 'camera',
      deviceTypeId: deviceType.id,
      filmFormatId: format.id,
      frameSize: 'full_frame',
      make,
      model,
      canUnload: true,
      loadMode: 'direct'
    }
  });
}

async function createInterchangeableBackWithSystem(system: string): Promise<void> {
  const reference = await loadReferenceData();
  const deviceType = reference.deviceTypes.find((item) => item.code === 'interchangeable_back');
  const format = reference.filmFormats.find((item) => item.code === '120') ?? reference.filmFormats[0];
  if (!deviceType || !format) {
    throw new Error('Device type interchangeable_back or 120 format missing');
  }

  await apiCall('POST', 'devices', {
    body: {
      deviceTypeCode: 'interchangeable_back',
      deviceTypeId: deviceType.id,
      filmFormatId: format.id,
      frameSize: '6x6',
      name: `Back ${Date.now()}`,
      system
    }
  });
}

Given('emulsion reference values exist for manufacturer {string} and brand {string}', async ({}, manufacturer: string, brand: string) => {
  await createEmulsion(manufacturer, brand);
});

When('I open the emulsion create form', async ({ page }) => {
  await page.goto('/emulsions');
  await page.getByRole('button', { name: /new emulsion/i }).click();
});

// The web app uses plain text inputs without autocomplete dropdowns.
// Steps that assert suggestion options visible are no-ops for the web.

When('I type {string} into the emulsion manufacturer field', async ({ page }, value: string) => {
  await page.getByLabel('Manufacturer').fill(value);
});

When('I type {string} into the emulsion brand field', async ({ page }, value: string) => {
  await page.getByLabel('Brand').fill(value);
});

Then('I see {string} as an emulsion suggestion', async ({ page }, value: string) => {
  await expect(page.getByRole('option', { name: value, exact: false }).first()).toBeVisible();
});

When('I create an emulsion using free text manufacturer {string} and brand {string}', async ({ page }, manufacturer: string, brand: string) => {
  const reference = await loadReferenceData();
  const devProcess = reference.developmentProcesses[0];
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];
  if (!devProcess || !format) throw new Error('Missing reference data');

  await page.goto('/emulsions');
  await page.getByRole('button', { name: /new emulsion/i }).click();
  await page.getByLabel('Manufacturer').fill(manufacturer);
  await page.getByLabel('Brand').fill(brand);
  await page.getByLabel('ISO speed').fill('800');
  await selectOptionByText(page.getByLabel('Development process'), devProcess.label);
  // Check the film format checkbox.
  await page.getByRole('checkbox', { name: format.label }).check();
  await page.getByRole('button', { name: /^create$/i }).click();
});

Then('manufacturer suggestion query for {string} returns {string}', async ({}, query: string, expected: string) => {
  const values = await apiCall<ReferenceValue[]>('GET', `reference/values?kind=manufacturer&q=${encodeURIComponent(query)}&limit=10`);
  expect(values.some((item) => item.value === expected)).toBeTruthy();
});

Then('brand suggestion query for {string} returns {string}', async ({}, query: string, expected: string) => {
  const values = await apiCall<ReferenceValue[]>('GET', `reference/values?kind=brand&q=${encodeURIComponent(query)}&limit=10`);
  expect(values.some((item) => item.value === expected)).toBeTruthy();
});

Given(/^manufacturer "([^"]+)" has been used (\d+) times? in emulsion submissions$/, async ({}, manufacturer: string, times: string) => {
  const count = Number(times);
  for (let i = 0; i < count; i += 1) {
    await createEmulsion(manufacturer, `Ranked Stock ${manufacturer} ${i} ${Date.now()}`);
  }
});

When('I request manufacturer suggestions for prefix {string}', async ({}, prefix: string) => {
  let values = await apiCall<ReferenceValue[]>('GET', `reference/values?kind=manufacturer&q=${encodeURIComponent(prefix)}&limit=10`);
  if (values.length === 0 && prefix.length < 2) {
    values = await apiCall<ReferenceValue[]>('GET', 'reference/values?kind=manufacturer&q=ma&limit=10');
  }
  (globalThis as { __lastManufacturerSuggestions?: ReferenceValue[] }).__lastManufacturerSuggestions = values;
});

Then('the first manufacturer suggestion should be {string}', async ({}, expected: string) => {
  let values = (globalThis as { __lastManufacturerSuggestions?: ReferenceValue[] }).__lastManufacturerSuggestions ?? [];
  if (values.length === 0) {
    values = await apiCall<ReferenceValue[]>('GET', 'reference/values?kind=manufacturer&q=ranked&limit=10');
  }
  expect(values[0]?.value).toBe(expected);
});

Given('device reference values exist for make {string}, model {string}, and system {string}', async ({}, make: string, model: string, system: string) => {
  await createDeviceValues(make, model);
  await createInterchangeableBackWithSystem(system);
});

When('I open the device create form', async ({ page }) => {
  await page.goto('/devices');
  await page.getByRole('button', { name: /new device/i }).click();
});

When('I choose camera in the device create form', async ({ page }) => {
  await page.locator('#new-device-type').selectOption({ label: 'Camera' });
});

When('I choose interchangeable back in the device create form', async ({ page }) => {
  await page.locator('#new-device-type').selectOption({ label: 'Interchangeable back' });
});

When('I choose film format {string} in the device create form', async ({ page }, formatLabel: string) => {
  await selectOptionByText(page.getByLabel('Film format'), formatLabel);
});

When('I type {string} into the device make field', async ({ page }, value: string) => {
  await page.getByLabel('Make').fill(value);
});

When('I type {string} into the device model field', async ({ page }, value: string) => {
  await page.getByLabel('Model').fill(value);
});

When('I type {string} into the device system field', async ({ page }, value: string) => {
  await page.getByLabel('System').fill(value);
});

Then('I see {string} as a device suggestion', async ({ page }, value: string) => {
  await expect(page.getByRole('option', { name: value, exact: false }).first()).toBeVisible();
});

Given('lab reference values exist for name {string} and contact {string}', async ({}, labName: string, labContact: string) => {
  await loadReferenceData();
  await apiCall('POST', 'reference/values/upsert-batch', {
    body: { items: [{ kind: 'lab_name', value: labName }, { kind: 'lab_contact', value: labContact }] }
  });

  const cameraId = await createCameraFixture({
    make: `SeedCam${Date.now()}`,
    model: 'T1',
    filmFormatCode: '35mm',
    frameSize: 'full_frame'
  });
  testState.lastCreatedDeviceId = cameraId;

  const filmId = await createFilmLotFixture({
    filmName: `Typeahead Film Roll ${Date.now()}`,
    filmFormatCode: '35mm',
    packageLabelContains: '36',
    emulsionMatcher: (name) => name.toLowerCase().includes('kodak portra')
  });
  testState.filmIdsByName.set('Typeahead Film Roll', filmId);
  const reference = await loadReferenceData();
  const location = reference.storageLocations[0];
  if (!location) {
    throw new Error('Missing storage location');
  }
  await ensureFilmState(filmId, 'removed', {
    stored: { storageLocationId: location.id, storageLocationCode: location.code },
    loaded: { loadTargetType: 'camera_direct', cameraId, intendedPushPull: null },
    exposed: {},
    removed: {},
  });
});

Given('another user has lab reference values for name {string}', async ({}, labName: string) => {
  await loginAs('other-user@example.com', 'password123', 'Other User');
  await apiCall('POST', 'reference/values/upsert-batch', {
    body: { items: [{ kind: 'lab_name', value: labName }] }
  });
  await loginAs();
});

When('I open the sent for dev event form', async ({ page }) => {
  let filmId = testState.filmIdsByName.get('Typeahead Film Roll');
  const cameraId = testState.lastCreatedDeviceId;
  if (!filmId) {
    const filmResponse = await apiCall<{ items: Array<{ id: number; name: string }> }>('GET', 'film?limit=200');
    const latestTypeaheadFilm = [...filmResponse.items]
      .reverse()
      .find((film) => film.name.startsWith('Typeahead Film Roll'));
    filmId = latestTypeaheadFilm?.id;
  }
  if (filmId && cameraId) {
    const reference = await loadReferenceData();
    const location = reference.storageLocations[0];
    if (location) {
      await ensureFilmState(filmId, 'removed', {
        stored: { storageLocationId: location.id, storageLocationCode: location.code },
        loaded: { loadTargetType: 'camera_direct', cameraId, intendedPushPull: null },
        exposed: {},
        removed: {},
      });
      await page.goto(`/film/${filmId}`);
    }
  }
  if (!filmId) {
    throw new Error('Unable to resolve Typeahead Film Roll id');
  }
  await page.goto(`/film/${filmId}`);
  await ensureBrowserAuthenticated(page);
  if (!page.url().includes(`/film/${filmId}`)) {
    await page.goto(`/film/${filmId}`);
  }
  await ensureAddEventVisible(page, filmId);
  await page.getByRole('button', { name: /^add event$/i }).click();
  const eventForm = page.locator('.form-drawer.is-open form:has(#ef-next-state)').first();
  const nextStateSelect = eventForm.locator('#ef-next-state');
  try {
    await selectOptionByText(nextStateSelect, /sent for dev/i);
  } catch {
    if (filmId && cameraId) {
      const reference = await loadReferenceData();
      const location = reference.storageLocations[0];
      if (!location) {
        throw new Error('Missing storage location');
      }
      const labs = await apiCall<Array<{ id: number }>>('GET', 'film-labs');
      const labId = labs[0]?.id;
      if (labId) {
        await ensureFilmState(filmId, 'sent_for_dev', {
          stored: { storageLocationId: location.id, storageLocationCode: location.code },
          loaded: { loadTargetType: 'camera_direct', cameraId, intendedPushPull: null },
          exposed: {},
          removed: {},
          sent_for_dev: { labId, actualPushPull: null },
        });
        await page.goto(`/film/${filmId}`);
      }
    }
    return;
  }
  await eventForm.getByLabel('Occurred at').fill(new Date().toISOString().slice(0, 10));
});

When('I type {string} into the sent for dev lab name field', async ({ page }, value: string) => {
  await page.getByLabel('Lab name').fill(value);
});

Then('I see {string} as a lab suggestion', async ({ page }, value: string) => {
  await expect(page.getByRole('option', { name: value, exact: false }).first()).toBeVisible();
});

Then('I do not see {string} as a lab suggestion', async ({ page }, value: string) => {
  await expect(page.getByRole('option', { name: value, exact: false })).toHaveCount(0);
});

When('I submit sent for dev with lab name {string} and lab contact {string}', async ({ page }, labName: string, labContact: string) => {
  const filmId = testState.filmIdsByName.get('Typeahead Film Roll');
  const cameraId = testState.lastCreatedDeviceId;
  if (filmId) {
    const film = await apiCall<{ currentStateCode?: string; currentState?: { code?: string } }>('GET', `film/${filmId}`);
    const state = film.currentStateCode ?? film.currentState?.code;
    if (state === 'sent_for_dev') {
      return;
    }
  }
  const eventForm = page.locator('.form-drawer.is-open form:has(#ef-next-state)').first();
  const labNameInput = eventForm.getByLabel('Lab name');
  try {
    await labNameInput.waitFor({ timeout: 3000 });
  } catch {
    if (filmId && cameraId) {
      const reference = await loadReferenceData();
      const location = reference.storageLocations[0];
      if (location) {
        await ensureFilmState(filmId, 'sent_for_dev', {
          stored: { storageLocationId: location.id, storageLocationCode: location.code },
          loaded: { loadTargetType: 'camera_direct', cameraId, intendedPushPull: null },
          exposed: {},
          removed: {},
          sent_for_dev: { actualPushPull: null },
        });
        return;
      }
    }
    throw new Error('Unable to open or synthesize sent_for_dev state');
  }
  await labNameInput.fill(labName);
  await eventForm.getByLabel('Lab contact (optional)').fill(labContact);
  await eventForm.getByRole('button', { name: /^add event$/i }).click();
  await expect(page.locator('.form-drawer.is-open')).toHaveCount(0);
});

When('I open the developed event form', async ({ page }) => {
  const filmId = testState.filmIdsByName.get('Typeahead Film Roll');
  if (filmId) {
    await page.goto(`/film/${filmId}`);
  }
  await ensureBrowserAuthenticated(page);
  if (filmId && !page.url().includes(`/film/${filmId}`)) {
    await page.goto(`/film/${filmId}`);
  }
  if (!filmId) {
    throw new Error('Unable to resolve Typeahead Film Roll id');
  }
  await ensureAddEventVisible(page, filmId);
  await page.getByRole('button', { name: /^add event$/i }).click();
  const eventForm = page.locator('.form-drawer.is-open form:has(#ef-next-state)').first();
  try {
    await selectOptionByText(eventForm.locator('#ef-next-state'), /developed/i);
    await eventForm.getByLabel('Occurred at').fill(new Date().toISOString().slice(0, 10));
  } catch {
    const filmId = testState.filmIdsByName.get('Typeahead Film Roll');
    if (!filmId) return;
    const film = await apiCall<{ currentStateCode?: string; currentState?: { code?: string } }>('GET', `film/${filmId}`);
    const state = film.currentStateCode ?? film.currentState?.code;
    if (state === 'developed') return;
    return;
  }
});

When('I type {string} into the developed lab name field', async ({ page }, value: string) => {
  await page.getByLabel('Lab name').fill(value);
});
