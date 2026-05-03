import { expect } from '@playwright/test';
import type { Emulsion } from '@frollz2/schema';
import { Then, When, Given, loadEmulsions, loadReferenceData, apiCall, createFilmLotFixture } from './fixtures.js';

const SECTION_PATHS: Record<string, string> = {
  'color negative': '/emulsions/color-negative-c41',
  'black-and-white': '/emulsions/black-and-white',
  'color positive': '/emulsions/color-positive-e6',
  'cine': '/emulsions/cine-ecn2',
};

async function findOrCreateEmulsion(name: string): Promise<Emulsion> {
  const emulsions = await loadEmulsions();
  const existing = emulsions.find((item) => `${item.manufacturer} ${item.brand}`.toLowerCase() === name.toLowerCase());
  if (existing) {
    return existing;
  }

  const reference = await loadReferenceData();
  const process = reference.developmentProcesses[0];
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];

  const created = await apiCall<Emulsion>('POST', 'emulsions', {
    body: {
      manufacturer: 'BDD',
      brand: name,
      isoSpeed: 400,
      developmentProcessId: process.id,
      filmFormatIds: [format.id]
    }
  });
  return created;
}

Given('an editable emulsion named {string}', async ({ }, name: string) => {
  await findOrCreateEmulsion(name);
});

Given('an emulsion named {string} is used by a film', async ({ }, name: string) => {
  const emulsion = await findOrCreateEmulsion(name);
  await createFilmLotFixture({
    filmName: `In Use ${Date.now()}`,
    filmFormatCode: '35mm',
    packageLabelContains: '36',
    emulsionMatcher: (emulsionName) => emulsionName.toLowerCase().includes(name.toLowerCase())
  });
});

When('I open the emulsion catalog', async ({ page }) => {
  await page.goto('/emulsions');
});

When('I open the {string} emulsion section', async ({ page }, section: string) => {
  const path = SECTION_PATHS[section];
  if (!path) {
    throw new Error(`Unknown emulsion section: ${section}`);
  }

  await page.goto(path);
});

When('I open emulsion detail for {string}', async ({ page }, emulsionName: string) => {
  const emulsions = await loadEmulsions();
  const emulsion = emulsions.find(
    (item) => `${item.manufacturer} ${item.brand}`.toLowerCase() === emulsionName.toLowerCase(),
  );

  if (!emulsion) {
    throw new Error(`Unable to find emulsion: ${emulsionName}`);
  }

  await page.goto(`/emulsions/${emulsion.id}`);
});

When('I try to submit an emulsion with missing required fields', async ({ page }) => {
  await page.goto('/emulsions');
  await page.getByRole('button', { name: /add emulsion/i }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
});

When('I edit emulsion {string} from the catalog', async ({ page }, name: string) => {
  await page.goto('/emulsions');
  const row = page.getByRole('row').filter({ hasText: name }).first();
  await row.getByTestId('emulsion-row-edit').click();
  await page.getByTestId('emulsion-edit-manufacturer').fill('BDD');
  await page.getByTestId('emulsion-edit-brand').fill('Updated Row');
  await page.getByRole('button', { name: /^save$/i }).click();
});

When('I edit emulsion {string} from detail page', async ({ page }, name: string) => {
  await page.goto('/emulsions');
  await page.getByRole('link', { name, exact: false }).first().click();
  await page.getByTestId('emulsion-detail-edit').click();
  await page.getByTestId('emulsion-edit-process').click();
  await page.getByRole('option', { name: /Black and White/i }).first().click();
  await page.getByRole('button', { name: /^save$/i }).click();
});

When('I delete emulsion {string} from the catalog', async ({ page }, name: string) => {
  await page.goto('/emulsions');
  const row = page.getByRole('row').filter({ hasText: name }).first();
  await row.getByTestId('emulsion-row-delete').click();
  await page.getByTestId('emulsion-delete-confirm').click();
});

When('I try to delete emulsion {string} from the catalog', async ({ page }, name: string) => {
  await page.goto('/emulsions');
  const row = page.getByRole('row').filter({ hasText: name }).first();
  await row.getByTestId('emulsion-row-delete').click();
  await page.getByTestId('emulsion-delete-confirm').click();
});

Then('I see emulsion row {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('cell', { name: text, exact: false })).toBeVisible();
});

Then('I do not see emulsion row {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('cell', { name: text, exact: false })).toHaveCount(0);
});

Then('I see emulsion detail process containing {string}', async ({ page }, processText: string) => {
  await expect(page.getByTestId('emulsion-detail-process-value')).toContainText(processText);
});

Then('I see an emulsion form validation message containing {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: false })).toBeVisible();
});

Then('I see an emulsion conflict message containing {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: false })).toBeVisible();
});
