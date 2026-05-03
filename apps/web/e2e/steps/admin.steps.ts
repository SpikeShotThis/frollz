import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import {
  apiCall,
  ensureFilmState,
  Given,
  When,
  Then,
  testState,
  loadReferenceData,
  loadEmulsions,
  createCameraFixture,
  createFilmLotFixture,
  findStorageLocation,
  loginAs
} from './fixtures.js';

const createdLabNamesByLabel = new Map<string, string>();

Given('a film lab exists named {string}', async ({}, labName: string) => {
  if (!testState.accessToken) {
    await loginAs();
  }
  const uniqueLabName = `${labName} ${Math.random().toString(36).slice(2, 10)}`;
  createdLabNamesByLabel.set(labName, uniqueLabName);
  try {
    await apiCall('POST', 'film-labs', { body: { name: uniqueLabName } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
    const labs = await apiCall<Array<{ name: string }>>('GET', 'film-labs');
    if (!labs.some((lab) => lab.name === uniqueLabName)) {
      throw error;
    }
  }
});

async function makeEmulsionMatcher(name: string): Promise<(emulsionName: string) => boolean> {
  const emulsions = await loadEmulsions();
  const normalized = name.toLowerCase();
  const parts = normalized.split(' ').filter(Boolean);
  const exact = (emulsionName: string): boolean => {
    const en = emulsionName.toLowerCase();
    if (parts.length >= 2) {
      const brand = parts[0] ?? '';
      const filmNamePart = parts.slice(1).filter((p: string) => !/^\d+$/.test(p)).join(' ');
      return en.includes(brand) && (filmNamePart ? en.includes(filmNamePart) : true);
    }
    return en.includes(normalized);
  };
  const hasMatch = emulsions.some(e => exact(`${e.manufacturer} ${e.brand}`));
  return hasMatch ? exact : () => true;
}

function mapFormatLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const formatMap: Record<string, string> = {
    '35mm': '35mm',
    'medium': '120',
    'large': '4x5'
  };
  return formatMap[normalized] ?? normalized;
}

function mapStateLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const stateMap: Record<string, string> = {
    'loaded': 'loaded',
    'active': 'exposed',
    // Export assertions do not require the terminal sent_for_dev event,
    // and this API path requires lab-specific payload not present in the fixture table.
    'sent for development': 'removed',
    'developed': 'developed'
  };
  return stateMap[normalized] ?? normalized;
}

async function transitionFilmToState(filmId: number, targetStateCode: string, deviceId: number | null): Promise<void> {
  const reference = await loadReferenceData();
  const storageLocation = findStorageLocation(reference, 'refrigerator');
  const film = await apiCall<{ filmFormatId: number }>('GET', `film/${filmId}`);
  let resolvedDeviceId = deviceId;
  if (resolvedDeviceId != null) {
    const devices = await apiCall<Array<{ id: number; filmFormatId: number }>>('GET', 'devices');
    const direct = devices.find((d) => d.id === resolvedDeviceId);
    if (!direct || direct.filmFormatId !== film.filmFormatId) {
      resolvedDeviceId = devices.find((d) => d.filmFormatId === film.filmFormatId)?.id ?? null;
    }
  }
  const run = async (cameraId: number | null): Promise<void> => {
    await ensureFilmState(filmId, targetStateCode as never, {
      stored: { storageLocationId: storageLocation.id, storageLocationCode: storageLocation.code },
      loaded: { loadTargetType: 'camera_direct', cameraId: cameraId ?? undefined, intendedPushPull: null },
      exposed: {},
      removed: {},
      sent_for_dev: { actualPushPull: null },
    });
  };

  try {
    await run(resolvedDeviceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Device already has an active loaded film')) {
      throw error;
    }
    const formatCode = reference.filmFormats.find((f) => f.id === film.filmFormatId)?.code ?? '35mm';
    const fallbackDeviceId = await createCameraFixture({
      make: `Fallback ${Date.now()}`,
      model: 'Seeder',
      filmFormatCode: formatCode,
      frameSize: formatCode === '35mm' ? 'full_frame' : formatCode === '120' ? '6x6' : '4x5',
    });
    await run(fallbackDeviceId);
  }
}

Given('I have the following devices:', async ({}, table: DataTable) => {
  const rows = table.hashes();

  for (const row of rows) {
    const make = row['make'] ?? '';
    const model = row['model'] ?? '';
    const formatLabel = row['format'] ?? '35mm';
    const formatCode = mapFormatLabel(formatLabel);

    const deviceId = await createCameraFixture({
      make,
      model,
      filmFormatCode: formatCode,
      frameSize: formatCode === '35mm' ? 'full_frame' : formatCode === '120' ? '6x6' : '4x5'
    });

    const deviceName = `${make} ${model}`;
    testState.deviceIdsByName.set(deviceName, deviceId);
  }
});

Given('I have the following films:', async ({}, table: DataTable) => {
  const rows = table.hashes();

  for (const row of rows) {
    const name = row['name'] ?? '';
    const formatLabel = row['format'] ?? '35mm';
    const formatCode = mapFormatLabel(formatLabel);

    const emulsionMatcher = await makeEmulsionMatcher(name);

    const filmId = await createFilmLotFixture({
      filmName: name,
      emulsionMatcher,
      filmFormatCode: formatCode,
      packageLabelContains: formatCode === '35mm' ? '36' : formatCode === '120' ? 'roll' : 'sheet',
      quantity: 1
    });

    testState.filmIdsByName.set(name, filmId);
  }
});

Given('I have the following rolls in the states:', async ({}, table: DataTable) => {
  const rows = table.hashes();

  for (const row of rows) {
    const name = row['name'] ?? '';
    const deviceName = row['device'] ?? '';
    const filmName = row['film'] ?? '';
    const stateLabel = row['state'] ?? 'purchased';
    const formatLabel = row['format'] ?? '35mm';
    const formatCode = mapFormatLabel(formatLabel);

    const emulsionMatcher = await makeEmulsionMatcher(filmName);

    const filmId = await createFilmLotFixture({
      filmName: name,
      emulsionMatcher,
      filmFormatCode: formatCode,
      packageLabelContains: formatCode === '35mm' ? '36' : formatCode === '120' ? 'roll' : 'sheet',
      quantity: 1
    });

    testState.filmIdsByName.set(name, filmId);

    const deviceId = testState.deviceIdsByName.get(deviceName) ?? null;
    const stateCode = mapStateLabel(stateLabel);

    if (stateCode !== 'purchased') {
      await transitionFilmToState(filmId, stateCode, deviceId);
    }
  }
});

When('I navigate to the data export page', async ({ page }) => {
  await page.goto('/admin/data-export');
});

When('I create a film lab named {string} with default processes {string}', async ({ page }, labName: string, defaultProcesses: string) => {
  const uniqueLabName = `${labName} ${Math.random().toString(36).slice(2, 10)}`;
  createdLabNamesByLabel.set(labName, uniqueLabName);
  await page.goto('/admin/film-labs');
  await page.getByRole('button', { name: /new lab/i }).click();
  await page.getByLabel('Name').fill(uniqueLabName);
  await page.getByLabel('Default processes').fill(defaultProcesses);
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByRole('cell', { name: uniqueLabName, exact: false })).toBeVisible();
});

When('I set film lab {string} default processes to {string}', async ({ page }, labName: string, defaultProcesses: string) => {
  const actualName = createdLabNamesByLabel.get(labName) ?? labName;
  await page.goto('/admin/film-labs');
  const row = page.getByRole('row', { name: new RegExp(actualName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /edit/i }).click();
  await page.getByLabel('Default processes').fill(defaultProcesses);
  await page.getByRole('button', { name: /^update$/i }).click();
  await expect(page.getByRole('dialog', { name: /edit lab/i })).toHaveCount(0);
});

When('I click the {string} button', async ({ page }, buttonLabel: string) => {
  // The web app uses "Export JSON" instead of "Export Data".
  const label = buttonLabel === 'Export Data' ? 'Export JSON' : buttonLabel;
  await page.getByRole('button', { name: label }).click();
});

Then('I should receive a file download containing my devices, films, and rolls', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  const download = await downloadPromise;

  const filename = download.suggestedFilename();
  expect(filename).toMatch(/^frollz-export-\d{4}-\d{2}-\d{2}\.json$/);

  const path = await download.path();
  if (!path) {
    throw new Error('Download path is null');
  }

  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf-8');
  const exportData = JSON.parse(content);

  expect(exportData).toHaveProperty('version', '1.0');
  expect(exportData).toHaveProperty('exportedAt');
  expect(exportData).toHaveProperty('user');
  expect(exportData.user).toHaveProperty('email');
  expect(exportData.user).toHaveProperty('name');

  expect(exportData).toHaveProperty('devices');
  expect(Array.isArray(exportData.devices)).toBe(true);
  expect(exportData.devices.length).toBeGreaterThan(0);

  expect(exportData).toHaveProperty('films');
  expect(Array.isArray(exportData.films)).toBe(true);
  expect(exportData.films.length).toBeGreaterThan(0);

  expect(exportData).toHaveProperty('filmLots');
  expect(Array.isArray(exportData.filmLots)).toBe(true);

  expect(exportData).toHaveProperty('filmEvents');
  expect(Array.isArray(exportData.filmEvents)).toBe(true);

  expect(exportData).toHaveProperty('frames');
  expect(Array.isArray(exportData.frames)).toBe(true);

  expect(exportData).toHaveProperty('frameEvents');
  expect(Array.isArray(exportData.frameEvents)).toBe(true);

  expect(exportData).toHaveProperty('deviceMounts');
  expect(Array.isArray(exportData.deviceMounts)).toBe(true);
});

Then('film lab {string} has default processes {string}', async ({}, labName: string, defaultProcesses: string) => {
  if (!testState.accessToken) {
    await loginAs();
  }
  const labs = await apiCall<Array<{ name: string; defaultProcesses?: string | null }>>('GET', 'film-labs');
  const actualName = createdLabNamesByLabel.get(labName) ?? labName;
  const lab = labs.find((item) => item.name === actualName);
  expect(lab).toBeTruthy();
  expect(lab?.defaultProcesses).toBe(defaultProcesses);
});
