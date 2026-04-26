import { expect } from '@playwright/test';
import { Given, Then, When, createCameraFixture, createFilmLotFixture, loadReferenceData, testState } from './fixtures.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

Given('a camera exists for loading named {string}', async ({}, label: string) => {
  const [make, ...modelParts] = label.split(' ');
  const model = modelParts.join(' ') || 'FM2';
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

When('I add a film named {string}', async ({ page }, filmName: string) => {
  const reference = await loadReferenceData();
  const emulsion = reference.emulsions.find((item) => `${item.manufacturer} ${item.brand}`.toLowerCase().includes('kodak portra'));
  const format = reference.filmFormats.find((item) => item.code === '35mm');
  const packageType = reference.packageTypes.find((item) => item.filmFormatId === format?.id && item.label.toLowerCase().includes('36'));

  if (!emulsion || !format || !packageType) {
    throw new Error('Missing reference values required for film creation scenario');
  }

  await page.goto('/film');
  await page.getByRole('button', { name: /add film/i }).click();
  const createForm = page.getByTestId('film-create-form');
  await createForm.getByTestId('film-create-name').getByRole('textbox', { name: 'Film name', exact: true }).fill(filmName);
  await createForm.getByTestId('film-create-emulsion').getByRole('combobox', { name: 'Emulsion', exact: true }).click();
  await page.getByRole('option', { name: `${emulsion.manufacturer} ${emulsion.brand}`, exact: false }).click();
  await createForm.getByTestId('film-create-format').getByRole('combobox', { name: 'Film format', exact: true }).click();
  await page.getByRole('option', { name: format.label, exact: true }).click();
  await createForm.getByTestId('film-create-package').getByRole('combobox', { name: 'Package type', exact: true }).click();
  await page.getByRole('option', { name: packageType.label, exact: false }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
});

When('I try to submit film with missing required fields', async ({ page }) => {
  await page.goto('/film');
  await page.getByRole('button', { name: /add film/i }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
});

When('I open film detail for {string}', async ({ page }, filmName: string) => {
  await page.goto('/film');
  await page.getByRole('link', { name: filmName, exact: false }).first().click();
});

When('I record the film as stored in {string}', async ({ page }, location: string) => {
  await page.getByLabel('Next state').click();
  await page.getByRole('option', { name: /stored/i }).click();
  await page.getByLabel('Storage location').click();
  await page.getByRole('option', { name: location, exact: false }).click();
  await page.getByRole('button', { name: /record event/i }).click();
});

When('I record the film as loaded into device {string}', async ({ page }, deviceName: string) => {
  await page.getByLabel('Next state').click();
  await page.getByRole('option', { name: /loaded/i }).click();
  const deviceCombobox = page.getByRole('combobox', { name: 'Device', exact: true });
  await deviceCombobox.click();

  const listboxId = await deviceCombobox.getAttribute('aria-controls');
  if (!listboxId) {
    throw new Error('Device combobox is missing aria-controls for option list');
  }

  await page
    .locator(`#${listboxId}`)
    .getByRole('option', { name: deviceName, exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: /record event/i }).click();
});

Then('I see {string} in the film table', async ({ page }, filmName: string) => {
  await expect(page.getByRole('cell', { name: filmName, exact: false })).toBeVisible();
});

Then('the film state badge for {string} is {string}', async ({ page }, _filmName: string, stateLabel: string) => {
  await expect(page.getByText(stateLabel, { exact: false })).toBeVisible();
});

Then('I see a film form validation message containing {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: false })).toBeVisible();
});

Then('I see the film current state {string}', async ({ page }, stateLabel: string) => {
  await expect(page.getByText(new RegExp(`^Current state:\\s*${escapeRegex(stateLabel)}$`, 'i'))).toBeVisible();
});
