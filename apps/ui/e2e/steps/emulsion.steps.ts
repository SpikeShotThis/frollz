import { expect } from '@playwright/test';
import { Then, When, loadReferenceData } from './fixtures.js';

const SECTION_PATHS: Record<string, string> = {
  'colour negative': '/emulsions/color-negative-c41',
  'black-and-white': '/emulsions/black-and-white',
  'colour positive': '/emulsions/color-positive-e6',
  'cine': '/emulsions/cine-ecn2',
};

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
  const reference = await loadReferenceData();
  const emulsion = reference.emulsions.find(
    (item) => `${item.manufacturer} ${item.brand}`.toLowerCase() === emulsionName.toLowerCase(),
  );

  if (!emulsion) {
    throw new Error(`Unable to find emulsion: ${emulsionName}`);
  }

  await page.goto(`/emulsions/${emulsion.id}`);
});

Then('I see emulsion row {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('cell', { name: text, exact: false })).toBeVisible();
});

Then('I see emulsion detail process containing {string}', async ({ page }, processText: string) => {
  await expect(page.getByTestId('emulsion-detail-process-value')).toContainText(processText);
});
