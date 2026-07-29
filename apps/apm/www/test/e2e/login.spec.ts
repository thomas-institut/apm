import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:8888';
const testAccount = process.env.TEST_ACCOUNT;
const testAccountPassword = process.env.TEST_ACCOUNT_PASSWORD;

if (!testAccount || !testAccountPassword) {
  throw new Error('Missing TEST_ACCOUNT or TEST_ACCOUNT_PASSWORD. Set them in apps/apm/www/.e2e-test.env');
}

test('shows login page and validates login flows', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page).toHaveTitle(/Login/);

  const usernameInput = page.getByLabel('Username');
  const passwordInput = page.getByLabel('Password');
  const passwordToggleButton = page.locator('#formBasicPassword + button');
  const loginButton = page.getByRole('button', { name: 'Login' });

  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(passwordToggleButton).toBeVisible();

  await usernameInput.fill('test');
  await passwordInput.fill('badpassword');
  await loginButton.click();
  await expect(page.getByText('Login failed')).toBeVisible();

  await usernameInput.fill(testAccount);
  await passwordInput.fill(testAccountPassword);
  await loginButton.click();
  await expect(page).toHaveTitle(/Dashboard/);

  const guestButton = page.getByRole('button', { name: 'Guest' });
  await expect(guestButton).toBeVisible();

  await guestButton.click();
  await expect(page.getByText('My Profile')).toBeVisible();
  const logoutButton = page.getByText('Logout');
  await expect(logoutButton).toBeVisible();

  await logoutButton.click();
  await expect(page).toHaveTitle(/Login/);
});

