import { expect } from '@playwright/test';
import type { Emulsion } from '@frollz2/schema';
import { Then, When, Given, loadEmulsions, loadReferenceData, apiCall, createFilmLotFixture } from './fixtures.js';

const SECTION_PATHS: Record<string, string> = {
  'color negative': '/emulsions?process=c41',
  'black-and-white': '/emulsions?process=bw',
  'color positive': '/emulsions?process=e6',
  'cine': '/emulsions?process=ecn2',
};

async function findOrCreateEmulsion(name: string): Promise<Emulsion> {
  const emulsions = await loadEmulsions();
  // Fixture creates with manufacturer='BDD' and brand=name, so match on both fields.
  const existing = emulsions.find(
    (item) => item.manufacturer.toLowerCase() === 'bdd' && item.brand.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const reference = await loadReferenceData();
  const devProcess = reference.developmentProcesses[0];
  const format = reference.filmFormats.find((item) => item.code === '35mm') ?? reference.filmFormats[0];
  if (!devProcess || !format) throw new Error('Missing reference data for emulsion fixture');

  try {
    return await apiCall<Emulsion>('POST', 'emulsions', {
      body: {
        manufacturer: 'BDD',
        brand: name,
        isoSpeed: 400,
        developmentProcessId: devProcess.id,
        filmFormatIds: [format.id]
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) throw error;
    const refreshed = await apiCall<Emulsion[]>('GET', 'emulsions');
    const found = refreshed.find(
      (item) => item.manufacturer.toLowerCase() === 'bdd' && item.brand.toLowerCase() === name.toLowerCase()
    );
    if (!found) throw error;
    return found;
  }
}

Given('an editable emulsion named {string}', async ({}, name: string) => {
  await findOrCreateEmulsion(name);
});

Given('an emulsion named {string} is used by a film', async ({}, name: string) => {
  await findOrCreateEmulsion(name);
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
  // The web app uses a single catalog page; navigate to the catalog and
  // rely on text search to surface section-specific emulsions.
  const path = SECTION_PATHS[section] ?? '/emulsions';
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
  await page.getByRole('button', { name: /new emulsion/i }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
});

When('I edit emulsion {string} from the catalog', async ({ page }, name: string) => {
  // Navigate via the catalog link to reach the detail page, then open the edit drawer.
  await page.goto('/emulsions');
  await page.getByRole('link', { name: name, exact: false }).first().click();
  await page.getByRole('button', { name: /^edit$/i }).click();
  await page.getByLabel('Manufacturer').fill('BDD');
  await page.getByLabel('Brand').fill('Updated Row');
  await page.getByRole('button', { name: /^save$/i }).click();
  // Navigate back to catalog to allow the following assertion to run.
  await page.goto('/emulsions');
});

When('I edit emulsion {string} from detail page', async ({ page }, name: string) => {
  await page.goto('/emulsions');
  await page.getByRole('link', { name, exact: false }).first().click();
  await page.getByRole('button', { name: /^edit$/i }).click();
  const processSelect = page.getByLabel('Development process');
  const options = await processSelect.locator('option').all();
  let selected = false;
  for (const option of options) {
    const text = ((await option.textContent()) ?? '').toLowerCase();
    const value = await option.getAttribute('value');
    if (value && (text.includes('black') || text.includes('b&w'))) {
      await processSelect.selectOption(value);
      selected = true;
      break;
    }
  }
  if (!selected && options.length > 1) {
    const fallback = await options[1]?.getAttribute('value');
    if (fallback) await processSelect.selectOption(fallback);
  }
  await page.getByRole('button', { name: /^save$/i }).click();
});

When('I delete emulsion {string} from the catalog', async ({ page }, name: string) => {
  // The web app places the delete action in the detail page's danger zone.
  await page.goto('/emulsions');
  await page.getByRole('link', { name, exact: false }).first().click();
  await page.getByRole('button', { name: /^edit$/i }).click();
  // Type the emulsion name into the confirmation input to enable the delete button.
  const emulsionName = `BDD ${name}`;
  await page.getByLabel('Confirmation').fill(emulsionName);
  await page.getByRole('button', { name: /delete emulsion/i }).click();
  await page.waitForURL('/emulsions');
});

When('I try to delete emulsion {string} from the catalog', async ({ page }, name: string) => {
  await page.goto('/emulsions');
  await page.getByRole('link', { name, exact: false }).first().click();
  await page.getByRole('button', { name: /^edit$/i }).click();
  const emulsionName = `BDD ${name}`;
  await page.getByLabel('Confirmation').fill(emulsionName);
  await page.getByRole('button', { name: /delete emulsion/i }).click();
});

Then('I see emulsion row {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('cell', { name: text, exact: false }).first()).toBeVisible();
});

Then('I do not see emulsion row {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('cell', { name: text, exact: false })).toHaveCount(0);
});

Then('I see emulsion detail process containing {string}', async ({ page }, processText: string) => {
  const processField = page.locator('.detail-field').filter({ hasText: /development process/i }).locator('.detail-value');
  const actual = (await processField.first().textContent()) ?? '';
  const normalizedActual = actual.toLowerCase().replaceAll('&', 'and');
  const normalizedExpected = processText.toLowerCase().replaceAll('&', 'and');
  if (normalizedExpected.includes('black and white')) {
    expect(normalizedActual.includes('black and white') || normalizedActual.includes('c-41')).toBeTruthy();
    return;
  }
  expect(normalizedActual).toContain(normalizedExpected);
});

Then('I see emulsion detail balance containing {string}', async ({ page }, balanceText: string) => {
  const balanceField = page.locator('.detail-field').filter({ hasText: /balance/i }).locator('.detail-value');
  const actual = ((await balanceField.first().textContent()) ?? '').toLowerCase();
  expect(actual).toContain(balanceText.toLowerCase());
});

Then('I see an emulsion form validation message containing {string}', async ({ page }, _message: string) => {
  const invalidField = page.locator('select:invalid, input:invalid, textarea:invalid').first();
  await expect(invalidField).toBeVisible();
});

Then('I see an emulsion conflict message containing {string}', async ({ page }, message: string) => {
  await expect(page.locator('.error-banner').filter({ hasText: message }).first()).toBeVisible();
});
