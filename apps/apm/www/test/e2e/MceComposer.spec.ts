import { test, expect } from '@playwright/test';

const testAccount = process.env.TEST_ACCOUNT;
const testAccountPassword = process.env.TEST_ACCOUNT_PASSWORD;

if (!testAccount || !testAccountPassword) {
  throw new Error('Missing TEST_ACCOUNT or TEST_ACCOUNT_PASSWORD. Set them in apps/apm/www/.e2e-test.env');
}

test('Basic Navigation', async ({ page }) => {
  await page.goto('http://localhost:8888/login');
  await expect(page).toHaveTitle(/Login/);
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(testAccount);
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(testAccountPassword);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveTitle(/Dashboard/);
  await page.goto('http://localhost:8888/beta/multiChunkEdition/1');
  await expect(page).toHaveTitle(/^MCE*/, { timeout: 10000 });
  await expect(page.getByText('Chunks', { exact: true })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: 'Witnesses' })).toBeVisible();
  await expect(page.getByText('Edition Text')).toBeVisible();
  await expect(page.getByText('Preview', { exact: true })).toBeVisible();
  await expect(page.getByText('Add Chunks')).toBeVisible();
  await expect(page.getByText('Session')).toBeVisible();
  await page.getByText('Preview', { exact: true }).click();
  await expect(page.getByText('Out of date')).toBeVisible();
  await expect(page.getByText('Click on the icon above to')).toBeVisible();
  await page.getByText('Out of date').click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByText('None').first().click();
  await expect(page.getByText('Out of date')).toBeVisible();
  await page.getByText('Session').click();
  await expect(page.getByText('Set break for chunk IB01-1 (at position 1) to \'None\'', { exact: true })).toBeVisible();
});