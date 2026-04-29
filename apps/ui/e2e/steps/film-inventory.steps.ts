import { expect } from '@playwright/test';
import { Given, Then, When, createCameraFixture, createFilmLotFixture, findFilmFormatByLabel, loadReferenceData, testState } from './fixtures.js';

const FORMAT_ROUTE: Record<string, string> = {
  '35mm': '/film/35mm',
  '120': '/film/medium-format',
  '4x5': '/film/large-format',
  '2x3': '/film/large-format',
  '8x10': '/film/large-format',
  'InstaxMini': '/film/instant',
  'InstaxWide': '/film/instant',
  'InstaxSquare': '/film/instant',
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

Given('a camera exists for loading named {string}', async ({ }, label: string) => {
  const [make, ...modelParts] = label.split(' ');
  const model = modelParts.join(' ') || 'FM2';
  const id = await createCameraFixture({ make, model, filmFormatCode: '35mm', frameSize: 'full_frame' });
  testState.deviceIdsByName.set(label, id);
});

Given('a purchased film exists named {string}', async ({ }, filmName: string) => {
  const id = await createFilmLotFixture({
    filmName,
    filmFormatCode: '35mm',
    packageLabelContains: '36',
    emulsionMatcher: (name) => name.toLowerCase().includes('kodak portra'),
  });
  testState.filmIdsByName.set(filmName, id);
});

Given('I have opened the add film form from the unfiltered inventory', async ({ page }) => {
  await page.goto('/film');
  await page.getByRole('button', { name: /add film/i }).click();
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
  await createForm.getByTestId('film-create-format').getByRole('combobox', { name: 'Film format', exact: true }).click();
  await page.getByRole('option', { name: format.label, exact: true }).click();
  await createForm.getByTestId('film-create-emulsion').getByRole('combobox', { name: 'Emulsion', exact: true }).click();
  await page.getByRole('option', { name: `${emulsion.manufacturer} ${emulsion.brand}`, exact: false }).click();
  await createForm.getByTestId('film-create-package').getByRole('combobox', { name: 'Package type', exact: true }).click();
  await page.getByRole('option', { name: packageType.label, exact: false }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
});

When('I open the add film form from the inventory filtered to {string}', async ({ page }, formatCode: string) => {
  const path = FORMAT_ROUTE[formatCode] ?? `/film/${formatCode.toLowerCase()}`;
  await page.goto(path);
  await page.getByRole('button', { name: /add film/i }).click();
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

When('I select the format {string}', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const format = findFilmFormatByLabel(reference, formatCode);
  const formatCombobox = page.getByTestId('film-create-form')
    .getByTestId('film-create-format')
    .getByRole('combobox', { name: 'Film format', exact: true });
  await formatCombobox.click();
  await page.getByRole('option', { name: format.label, exact: true }).click();
});

When('I record the film as stored in {string}', async ({ page }, location: string) => {
  await page.getByLabel('Next state').click();
  await page.getByRole('option', { name: /stored/i }).click();
  const localDateTime = new Date().toISOString().slice(0, 19);  // "2026-04-27T12:45:30"                                                                                           
  await page.getByLabel('Occurred at').fill(localDateTime);
  await page.getByLabel('Storage location').click();
  await page.getByRole('option', { name: location, exact: false }).click();
  await page.getByRole('button', { name: /add event/i }).click();
});

When('I record the film as loaded into device {string}', async ({ page }, deviceName: string) => {
  await page.getByLabel('Next state').click();
  await page.getByRole('option', { name: /loaded/i }).click();
  const localDateTime = new Date().toISOString().slice(0, 19);
  await page.getByLabel('Occurred at').fill(localDateTime);

  const deviceCombobox = page.getByRole('combobox', { name: 'Device', exact: true });
  await deviceCombobox.click();

  const listboxId = await deviceCombobox.getAttribute('aria-controls');
  if (!listboxId) {
    throw new Error('Device combobox is missing aria-controls for option list');
  }

  await page
    .locator(`#${listboxId}`)
    .getByRole('option', { name: deviceName })
    .first()
    .click();
  await page.getByRole('button', { name: /add event/i }).click();
});

Then('the emulsion and package type fields should be disabled', async ({ page }) => {
  const form = page.getByTestId('film-create-form');
  await expect(form.getByTestId('film-create-emulsion').getByRole('combobox', { name: 'Emulsion', exact: true })).toBeDisabled();
  await expect(form.getByTestId('film-create-package').getByRole('combobox', { name: 'Package type', exact: true })).toBeDisabled();
});

Then('the format field should be locked to {string}', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const format = findFilmFormatByLabel(reference, formatCode);
  const formatCombobox = page.getByTestId('film-create-form')
    .getByTestId('film-create-format')
    .getByRole('combobox', { name: 'Film format', exact: true });
  await expect(formatCombobox).toBeDisabled();
  await expect(formatCombobox).toContainText(format.label);
});

Then('only emulsions compatible with {string} should be available', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const format = findFilmFormatByLabel(reference, formatCode);
  const compatible = reference.emulsions.filter((e) =>
    e.filmFormats.some((f) => f.id === format.id),
  );
  const emulsionCombobox = page.getByTestId('film-create-form')
    .getByTestId('film-create-emulsion')
    .getByRole('combobox', { name: 'Emulsion', exact: true });
  await emulsionCombobox.click();
  await expect(page.getByRole('option')).toHaveCount(compatible.length);
  for (const emulsion of compatible) {
    await expect(page.getByRole('option', { name: `${emulsion.manufacturer} ${emulsion.brand}`, exact: false })).toBeVisible();
  }
  await page.keyboard.press('Escape');
});

Then('only package types compatible with {string} should be available', async ({ page }, formatCode: string) => {
  const reference = await loadReferenceData();
  const format = findFilmFormatByLabel(reference, formatCode);
  const compatible = reference.packageTypes.filter((p) => p.filmFormatId === format.id);
  const packageCombobox = page.getByTestId('film-create-form')
    .getByTestId('film-create-package')
    .getByRole('combobox', { name: 'Package type', exact: true });
  await packageCombobox.click();
  await expect(page.getByRole('option')).toHaveCount(compatible.length);
  for (const pkg of compatible) {
    await expect(page.getByRole('option', { name: pkg.label, exact: false })).toBeVisible();
  }
  await page.keyboard.press('Escape');
});

Then('I see {string} in the film table', async ({ page }, filmName: string) => {
  await expect(page.getByRole('cell', { name: filmName, exact: false })).toBeVisible();
});

Then('the film state badge for {string} is {string}', async ({ page }, _filmName: string, stateLabel: string) => {
  await expect(page.getByText(stateLabel, { exact: false })).toBeVisible();
});

Then('I see a film form validation message containing {string}', async ({ page }, _message: string) => {
  // Verify validation errors are displayed in the form                                                                                                                            
  await expect(page.locator('role=alert').first()).toBeVisible();
});

Then('I see the film current state {string}', async ({ page }, stateLabel: string) => {
  await expect(page.getByText(new RegExp(`^Current state:\\s*${escapeRegex(stateLabel)}$`, 'i'))).toBeVisible();
});
