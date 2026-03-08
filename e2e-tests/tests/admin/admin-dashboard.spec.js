const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { AdminDashboardPage, AdminMerchantsPage, AdminProductsPage, AdminOrdersPage } = require('../../pages/AdminDashboardPage');
const { ADMIN_DATA, PRODUCT_DATA } = require('../../utils/test-data');

test.describe.serial('Admin Dashboard and Management', () => {
  let isLoggedIn = false;

  test.beforeEach(async ({ page }) => {
    if (!isLoggedIn) {
      await page.goto('/');

      // Login as admin only once
      const loginPage = new LoginPage(page);
      await loginPage.loginAsAdmin(
        ADMIN_DATA.phone,
        ADMIN_DATA.otp,
        ADMIN_DATA.email,
        ADMIN_DATA.password
      );
      await page.waitForTimeout(3000);
      isLoggedIn = true;
    }
  });

  test('should display admin dashboard', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(2000);

    // Verify on admin dashboard
    expect(page.url()).toContain('/admin');

    // Check for dashboard elements
    const hasDashboardElements = await page.isVisible(
      'text=Dashboard, text=Orders, text=Revenue, text=Users'
    ).catch(() => false);

    expect(hasDashboardElements).toBeTruthy();
  });

  test('should navigate to users management', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    // Click users link
    const usersLink = page.locator('a:has-text("Users")').first();

    if (await usersLink.isVisible()) {
      await usersLink.click();
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('/admin/users');
    }
  });

  test('should navigate to merchants management', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    await adminDashboard.goToMerchants();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/admin/merchants');
  });

  test('should navigate to products management', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    await adminDashboard.goToProducts();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/admin/products');
  });

  test('should navigate to orders management', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    await adminDashboard.goToOrders();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/admin/orders');
  });

  test('should navigate to settings', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    const settingsLink = page.locator('a:has-text("Settings")').first();

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('/admin/settings');
    }
  });

  test('should display dashboard metrics', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(2000);

    // Check for metrics cards
    const hasMetrics = await page.isVisible(
      '[class*="metric"], [class*="card"], [class*="stat"]'
    ).catch(() => false);

    expect(hasMetrics).toBeTruthy();
  });

  test('should display recent orders on dashboard', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page);

    await adminDashboard.navigateToDashboard();
    await page.waitForTimeout(2000);

    // Look for orders section
    const hasOrdersSection = await page.isVisible(
      'text=Recent Orders, text=Latest Orders, text=Orders'
    ).catch(() => false);

    expect(hasOrdersSection).toBeTruthy();
  });
});
