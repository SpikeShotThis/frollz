import { expect } from '@playwright/test';
import { getFrameSizeCodesForFormatCode } from '@frollz2/schema';
import { Given, Then, When, createCameraFixture, testState } from './fixtures.js';

Given('another user has a camera with make {string} and model {string}', async ({}, make: string, model: string) => {
  const otherEmail = 'other-user@example.com';
  const id = await createCameraFixture({ ownerEmail: otherEmail, make, model, filmFormatCode: '35mm', frameSize: 'full_frame' });
  testState.lastOtherUserDeviceId = id;
});

When('I create a camera with make {string} and model {string} for format {string}', async ({ page }, make: string, model: string, formatLabel: string) => {
  const deviceLabel = `${make} ${model}`;

  await page.goto('/devices');
  await page.getByRole('button', { name: /add device/i }).click();
  await page.getByLabel('Device type').click();
  await page.getByRole('option', { name: /camera/i }).click();
  await page.getByLabel('Film format').click();
  await page.getByRole('option', { name: formatLabel, exact: true }).click();
  await page.getByLabel('Make').fill(make);
  await page.getByLabel('Model').fill(model);
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page.getByText(/device created/i)).toBeVisible();
  await expect(page.getByRole('cell', { name: deviceLabel, exact: false })).toBeVisible();
});

When('I open the device detail for {string}', async ({ page }, label: string) => {
  await page.goto('/devices');
  await page.getByRole('link', { name: label, exact: false }).first().click();
});

When('I open the other user\'s device detail', async ({ page }) => {
  if (!testState.lastOtherUserDeviceId) {
    throw new Error('No cross-user device fixture id is available');
  }

  await page.goto(`/devices/${testState.lastOtherUserDeviceId}`);
});

Then('I see {string} in the device table', async ({ page }, label: string) => {
  await expect(page.getByRole('cell', { name: label, exact: false })).toBeVisible();
});

Then('I see device detail header {string}', async ({ page }, label: string) => {
  await expect(page.getByText(label, { exact: false })).toBeVisible();
});

Then('I see a device detail error containing {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: false })).toBeVisible();
});

Given('I have opened the add device form', async ({ page }) => {
  await page.goto('/devices');
  await page.getByRole('button', { name: /add device/i }).click();
});

Given('I have chosen the device type of {string}', async ({ page }, deviceTypeLabel: string) => {
  await page.getByLabel('Device type').click();
  await page.getByRole('option', { name: deviceTypeLabel, exact: false }).click();
});

When('I select the format {string}', async ({ page }, formatLabel: string) => {
  await page.getByLabel('Film format').click();
  await page.getByRole('option', { name: formatLabel, exact: true }).click();
});

When('I select that camera is not directly loadable', async ({ page }) => {
  await page.getByLabel('Directly loadable').click();
});

When('I try to submit a device with missing required fields', async ({ page }) => {
  await page.goto('/devices');
  await page.getByRole('button', { name: /add device/i }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
});

Then('the frame size field should be disabled', async ({ page }) => {
  await expect(page.getByLabel('Frame size')).toBeDisabled();
});

Then('only frame sizes compatible with {string} should be available', async ({ page }, formatCode: string) => {
  const expectedCodes = getFrameSizeCodesForFormatCode(formatCode);
  await page.getByLabel('Frame size').click();
  const options = page.getByRole('option');
  await expect(options).toHaveCount(expectedCodes.length);
  for (const code of expectedCodes) {
    await expect(page.getByRole('option', { name: code, exact: true })).toBeVisible();
  }
  await page.keyboard.press('Escape');
});

Then('I see a device form validation message containing {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message, { exact: false })).toBeVisible();
});
