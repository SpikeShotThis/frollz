import { expect } from '@playwright/test';
import { Given, Then, When, TEST_USER_EMAIL, TEST_USER_PASSWORD, ensureUser } from './fixtures.js';

Given('I am on the login page', async ({ page }) => {
  await ensureUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  await page.goto('/auth/login');
});

When('I sign in with test user credentials', async ({ page }) => {
  await page.getByLabel('Email').fill(TEST_USER_EMAIL);
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
});

When('I sign in with invalid credentials', async ({ page }) => {
  await page.getByLabel('Email').fill(TEST_USER_EMAIL);
  await page.getByLabel('Password').fill('definitely-wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();
});

Then('I should be on the dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/);
});

Then('I should see an authentication error', async ({ page }) => {
  await expect(page.locator('.error-banner')).toBeVisible();
});
