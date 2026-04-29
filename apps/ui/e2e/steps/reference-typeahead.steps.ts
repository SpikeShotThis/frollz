import { expect } from '@playwright/test';
import type { Emulsion, ReferenceValue } from '@frollz2/schema';
import {
  Given,
  Then,
  When,
  apiCall,
  createCameraFixture,
  createFilmLotFixture,
  loadReferenceData,
  loginAs
} from './fixtures.js';

async function createEmulsion(manufacturer: string, brand: string): Promise<Emulsion> {
  const reference = await loadReferenceData();
  const process = reference.developmentProcesses[0];
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];

  return apiCall<Emulsion>('POST', 'emulsions', {
    body: {
      manufacturer,
      brand,
      isoSpeed: 200 + Math.floor(Math.random() * 500),
      developmentProcessId: process.id,
      filmFormatIds: [format.id]
    }
  });
}

async function createDeviceValues(make: string, model: string): Promise<void> {
  const reference = await loadReferenceData();
  const deviceType = reference.deviceTypes.find((item) => item.code === 'camera');
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];
  if (!deviceType) {
    throw new Error('Device type camera missing');
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
  if (!deviceType) {
    throw new Error('Device type interchangeable_back missing');
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

Given('emulsion reference values exist for manufacturer {string} and brand {string}', async ({ }, manufacturer: string, brand: string) => {
  await createEmulsion(manufacturer, brand);
});

When('I open the emulsion create form', async ({ page }) => {
  await page.goto('/emulsions');
  await page.getByRole('button', { name: /add emulsion/i }).click();
});

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
  const process = reference.developmentProcesses[0];
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];

  await page.goto('/emulsions');
  await page.getByRole('button', { name: /add emulsion/i }).click();
  await page.getByLabel('Manufacturer').fill(manufacturer);
  await page.getByLabel('Brand').fill(brand);
  await page.getByLabel('ISO').fill('800');
  await page.getByLabel('Development process').click();
  await page.getByRole('option', { name: process.label, exact: true }).click();
  await page.getByLabel('Film formats').click();
  await page.getByRole('option', { name: format.label, exact: true }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByText(/emulsion created/i)).toBeVisible();
});

Then('manufacturer suggestion query for {string} returns {string}', async ({ }, query: string, expected: string) => {
  const values = await apiCall<ReferenceValue[]>('GET', `reference/values?kind=manufacturer&q=${encodeURIComponent(query)}&limit=10`);
  expect(values.some((item) => item.value === expected)).toBeTruthy();
});

Then('brand suggestion query for {string} returns {string}', async ({ }, query: string, expected: string) => {
  const values = await apiCall<ReferenceValue[]>('GET', `reference/values?kind=brand&q=${encodeURIComponent(query)}&limit=10`);
  expect(values.some((item) => item.value === expected)).toBeTruthy();
});

Given('manufacturer {string} has been used {int} times in emulsion submissions', async ({ }, manufacturer: string, times: number) => {
  for (let i = 0; i < times; i += 1) {
    await createEmulsion(manufacturer, `Ranked Stock ${manufacturer} ${i} ${Date.now()}`);
  }
});

When('I request manufacturer suggestions for prefix {string}', async ({ }, prefix: string) => {
  const values = await apiCall<ReferenceValue[]>('GET', `reference/values?kind=manufacturer&q=${encodeURIComponent(prefix)}&limit=10`);
  (globalThis as { __lastManufacturerSuggestions?: ReferenceValue[] }).__lastManufacturerSuggestions = values;
});

Then('the first manufacturer suggestion should be {string}', async ({ }, expected: string) => {
  const values = (globalThis as { __lastManufacturerSuggestions?: ReferenceValue[] }).__lastManufacturerSuggestions ?? [];
  expect(values[0]?.value).toBe(expected);
});

Given('device reference values exist for make {string}, model {string}, and system {string}', async ({ }, make: string, model: string, system: string) => {
  await createDeviceValues(make, model);
  await createInterchangeableBackWithSystem(system);
});

When('I open the device create form', async ({ page }) => {
  await page.goto('/devices');
  await page.getByRole('button', { name: /add device/i }).click();
});

When('I choose camera in the device create form', async ({ page }) => {
  await page.getByLabel('Device type').click();
  await page.getByRole('option', { name: /camera/i }).click();
});

When('I choose interchangeable back in the device create form', async ({ page }) => {
  await page.getByLabel('Device type').click();
  await page.getByRole('option', { name: /interchangeable back/i }).click();
});

When('I choose film format {string} in the device create form', async ({ page }, formatLabel: string) => {
  await page.getByLabel('Film format').click();
  await page.getByRole('option', { name: formatLabel, exact: true }).click();
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

Given('lab reference values exist for name {string} and contact {string}', async ({ }, labName: string, labContact: string) => {
  await apiCall('POST', 'reference/values/upsert-batch', {
    body: { items: [{ kind: 'lab_name', value: labName }, { kind: 'lab_contact', value: labContact }] }
  });

  const cameraId = await createCameraFixture({
    make: `SeedCam${Date.now()}`,
    model: 'T1',
    filmFormatCode: '35mm',
    frameSize: 'full_frame'
  });

  const filmId = await createFilmLotFixture({
    filmName: 'Typeahead Film Roll',
    filmFormatCode: '35mm',
    packageLabelContains: '36',
    emulsionMatcher: (name) => name.toLowerCase().includes('kodak portra')
  });
  const reference = await loadReferenceData();
  const location = reference.storageLocations[0];
  if (!location) {
    throw new Error('Missing storage location');
  }

  await apiCall('POST', `film/${filmId}/events`, {
    body: {
      filmStateCode: 'stored',
      occurredAt: new Date().toISOString(),
      eventData: { storageLocationId: location.id, storageLocationCode: location.code }
    }
  });
  await apiCall('POST', `film/${filmId}/events`, {
    body: {
      filmStateCode: 'loaded',
      occurredAt: new Date().toISOString(),
      eventData: { loadTargetType: 'camera_direct', cameraId, intendedPushPull: null }
    }
  });
  await apiCall('POST', `film/${filmId}/events`, {
    body: {
      filmStateCode: 'exposed',
      occurredAt: new Date().toISOString(),
      eventData: {}
    }
  });
  await apiCall('POST', `film/${filmId}/events`, {
    body: {
      filmStateCode: 'removed',
      occurredAt: new Date().toISOString(),
      eventData: {}
    }
  });
});

Given('another user has lab reference values for name {string}', async ({ }, labName: string) => {
  await loginAs('other-user@example.com', 'password123', 'Other User');
  await apiCall('POST', 'reference/values/upsert-batch', {
    body: { items: [{ kind: 'lab_name', value: labName }] }
  });
  await loginAs();
});

When('I open the sent for dev event form', async ({ page }) => {
  await page.getByLabel('Next state').click();
  await page.getByRole('option', { name: /sent for dev/i }).click();
  await page.getByLabel('Occurred at').fill(new Date().toISOString().slice(0, 19));
});

When('I type {string} into the sent for dev lab name field', async ({ page }, value: string) => {
  await page.getByLabel('Lab name (optional)').fill(value);
});

Then('I see {string} as a lab suggestion', async ({ page }, value: string) => {
  await expect(page.getByRole('option', { name: value, exact: false }).first()).toBeVisible();
});

Then('I do not see {string} as a lab suggestion', async ({ page }, value: string) => {
  await expect(page.getByRole('option', { name: value, exact: false })).toHaveCount(0);
});

When('I submit sent for dev with lab name {string} and lab contact {string}', async ({ page }, labName: string, labContact: string) => {
  await page.getByLabel('Lab name (optional)').fill(labName);
  await page.getByLabel('Lab contact (optional)').fill(labContact);
  await page.getByRole('button', { name: /add event/i }).click();
});

When('I open the developed event form', async ({ page }) => {
  await page.getByLabel('Next state').click();
  await page.getByRole('option', { name: /developed/i }).click();
  await page.getByLabel('Occurred at').fill(new Date().toISOString().slice(0, 19));
});

When('I type {string} into the developed lab name field', async ({ page }, value: string) => {
  await page.getByLabel('Lab name (optional)').fill(value);
});
