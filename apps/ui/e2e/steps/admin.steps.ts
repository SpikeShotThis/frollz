import { expect } from '@playwright/test';
import { DataTable } from '@cucumber/cucumber';
import {
  Given,
  When,
  Then,
  testState,
  loadReferenceData,
  createCameraFixture,
  createFilmLotFixture,
  recordFilmEvent,
  findStorageLocation
} from './fixtures.js';

// Helper function to map format labels to format codes
function mapFormatLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const formatMap: Record<string, string> = {
    '35mm': '35mm',
    'medium': '120',
    'large': '4x5'
  };
  return formatMap[normalized] ?? normalized;
}

// Helper function to map state labels to state codes
function mapStateLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const stateMap: Record<string, string> = {
    'loaded': 'loaded',
    'active': 'exposed',
    'sent for development': 'sent_for_dev',
    'developed': 'developed'
  };
  return stateMap[normalized] ?? normalized;
}

// Helper function to transition film to a target state
async function transitionFilmToState(filmId: number, targetStateCode: string, deviceId: number | null): Promise<void> {
  const reference = await loadReferenceData();
  const storageLocation = findStorageLocation(reference, 'refrigerator');
  const now = new Date().toISOString();

  // Determine the event sequence needed to reach the target state
  const stateSequence: Array<{ code: string; eventData: Record<string, unknown> }> = [];

  switch (targetStateCode) {
    case 'stored':
      stateSequence.push({
        code: 'stored',
        eventData: { storageLocationId: storageLocation.id, storageLocationCode: storageLocation.code }
      });
      break;

    case 'loaded':
      stateSequence.push(
        {
          code: 'stored',
          eventData: { storageLocationId: storageLocation.id, storageLocationCode: storageLocation.code }
        },
        {
          code: 'loaded',
          eventData: {
            loadTargetType: 'camera_direct',
            cameraId: deviceId!,
            intendedPushPull: null
          }
        }
      );
      break;

    case 'exposed':
      stateSequence.push(
        {
          code: 'stored',
          eventData: { storageLocationId: storageLocation.id, storageLocationCode: storageLocation.code }
        },
        {
          code: 'loaded',
          eventData: {
            loadTargetType: 'camera_direct',
            cameraId: deviceId!,
            intendedPushPull: null
          }
        },
        {
          code: 'exposed',
          eventData: {}
        }
      );
      break;

    case 'sent_for_dev':
      stateSequence.push(
        {
          code: 'stored',
          eventData: { storageLocationId: storageLocation.id, storageLocationCode: storageLocation.code }
        },
        {
          code: 'loaded',
          eventData: {
            loadTargetType: 'camera_direct',
            cameraId: deviceId!,
            intendedPushPull: null
          }
        },
        {
          code: 'exposed',
          eventData: {}
        },
        {
          code: 'removed',
          eventData: {}
        },
        {
          code: 'sent_for_dev',
          eventData: {
            labName: null,
            labContact: null,
            actualPushPull: null
          }
        }
      );
      break;

    default:
      throw new Error(`Unsupported target state: ${targetStateCode}`);
  }

  // Record each event in sequence
  for (const state of stateSequence) {
    await recordFilmEvent(filmId, {
      filmStateCode: state.code as never,
      occurredAt: now,
      notes: null,
      eventData: state.eventData
    });
  }
}

Given('I have the following devices:', async ({ }, table: DataTable) => {
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

Given('I have the following films:', async ({ }, table: DataTable) => {
  const rows = table.hashes();

  for (const row of rows) {
    const name = row['name'] ?? '';
    const formatLabel = row['format'] ?? '35mm';
    const formatCode = mapFormatLabel(formatLabel);

    // Parse the film name to extract emulsion info
    // e.g., "Kodak Portra 400" -> look for emulsion containing "Kodak Portra"
    const emulsionMatcher = (emulsionName: string) => {
      const normalized = name.toLowerCase();
      const emulsionNormalized = emulsionName.toLowerCase();

      // Try to match brand name (first word) and film name
      const parts = normalized.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        const brand = parts[0];
        const filmName = parts.slice(1).filter(p => !/^\d+$/.test(p)).join(' ');
        return emulsionNormalized.includes(brand) && emulsionNormalized.includes(filmName);
      }

      return emulsionNormalized.includes(normalized);
    };

    const filmId = await createFilmLotFixture({
      filmName: name,
      emulsionMatcher,
      filmFormatCode: formatCode,
      packageLabelContains: formatCode === '35mm' ? 'roll' : formatCode === '120' ? 'roll' : 'sheet',
      quantity: 1
    });

    testState.filmIdsByName.set(name, filmId);
  }
});

Given('I have the following rolls in the states:', async ({ }, table: DataTable) => {
  const rows = table.hashes();

  for (const row of rows) {
    const name = row['name'] ?? '';
    const deviceName = row['device'] ?? '';
    const filmName = row['film'] ?? '';
    const stateLabel = row['state'] ?? 'purchased';

    // Get the film ID by name - if it doesn't exist, the film was created in a previous step
    let filmId = testState.filmIdsByName.get(filmName);

    if (!filmId) {
      // If not found, this is a new roll, so create it
      const formatLabel = row['format'] ?? '35mm';
      const formatCode = mapFormatLabel(formatLabel);

      const emulsionMatcher = (emulsionName: string) => {
        const normalized = filmName.toLowerCase();
        const emulsionNormalized = emulsionName.toLowerCase();
        const parts = normalized.split(' ').filter(Boolean);
        if (parts.length >= 2) {
          const brand = parts[0];
          const filmNamePart = parts.slice(1).filter(p => !/^\d+$/.test(p)).join(' ');
          return emulsionNormalized.includes(brand) && emulsionNormalized.includes(filmNamePart);
        }
        return emulsionNormalized.includes(normalized);
      };

      filmId = await createFilmLotFixture({
        filmName: name,
        emulsionMatcher,
        filmFormatCode: formatCode,
        packageLabelContains: formatCode === '35mm' ? 'roll' : formatCode === '120' ? 'roll' : 'sheet',
        quantity: 1
      });
    } else {
      // If the film exists, we need to create a new film with the same emulsion
      // For simplicity, we'll create it with the roll name
      const reference = await loadReferenceData();
      const formatLabel = row['format'] ?? '35mm';
      const formatCode = mapFormatLabel(formatLabel);

      const emulsionMatcher = (emulsionName: string) => {
        const normalized = filmName.toLowerCase();
        const emulsionNormalized = emulsionName.toLowerCase();
        const parts = normalized.split(' ').filter(Boolean);
        if (parts.length >= 2) {
          const brand = parts[0];
          const filmNamePart = parts.slice(1).filter(p => !/^\d+$/.test(p)).join(' ');
          return emulsionNormalized.includes(brand) && emulsionNormalized.includes(filmNamePart);
        }
        return emulsionNormalized.includes(normalized);
      };

      filmId = await createFilmLotFixture({
        filmName: name,
        emulsionMatcher,
        filmFormatCode: formatCode,
        packageLabelContains: formatCode === '35mm' ? 'roll' : formatCode === '120' ? 'roll' : 'sheet',
        quantity: 1
      });
    }

    testState.filmIdsByName.set(name, filmId);

    // Get device ID if state requires it
    const deviceId = testState.deviceIdsByName.get(deviceName) ?? null;
    const stateCode = mapStateLabel(stateLabel);

    // Transition film to target state
    if (stateCode !== 'purchased') {
      await transitionFilmToState(filmId, stateCode, deviceId);
    }
  }
});

When('I navigate to the data export page', async ({ page }) => {
  await page.goto('/admin/data-export');
});

When('I click the {string} button', async ({ page }, buttonLabel: string) => {
  await page.getByRole('button', { name: buttonLabel }).click();
});

Then('I should receive a file download containing my devices, films, and rolls', async ({ page }) => {
  // Wait for the download to start
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

  // The download should have been triggered by the previous click
  const download = await downloadPromise;

  // Verify the filename matches the expected pattern
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/^frollz-export-\d{4}-\d{2}-\d{2}\.json$/);

  // Download the file and read its contents
  const path = await download.path();
  if (!path) {
    throw new Error('Download path is null');
  }

  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf-8');
  const exportData = JSON.parse(content);

  // Verify the structure and content
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
