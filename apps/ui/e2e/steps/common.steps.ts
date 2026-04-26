import { expect } from '@playwright/test';
import { Given, Then, When, TEST_USER_PASSWORD, ensureUser } from './fixtures.js';

Given('I am authenticated as {string}', async ({ page }, email: string) => {
  await ensureUser(email, TEST_USER_PASSWORD);

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
});

Given('I am not authenticated', async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});

When('I navigate to {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

Then('I am redirected to the login page', async ({ page }) => {
  await expect(page).toHaveURL(/\/login/);
});
