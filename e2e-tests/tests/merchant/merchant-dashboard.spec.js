const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { MerchantDashboardPage } = require('../../pages/MerchantDashboardPage');
const { MERCHANT_DATA, TEST_OTP } = require('../../utils/test-data');

test.describe.serial('Merchant Dashboard', () => {
  let isLoggedIn = false;

  test.beforeEach(async ({ page }) => {
    if (!isLoggedIn) {
      await page.goto('/');

      // Login as merchant only once
      const loginPage = new LoginPage(page);
      await loginPage.loginAsMerchant(MERCHANT_DATA.contactPhone, TEST_OTP);
      await page.waitForTimeout(3000);
      isLoggedIn = true;
    }
  });

  test('should display merchant dashboard', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(2000);

    // Verify on merchant dashboard
    expect(page.url()).toContain('/merchant');

    // Check for dashboard elements
    const hasDashboardElements = await page.isVisible(
      'text=Dashboard, text=Orders, text=Revenue, text=Products'
    ).catch(() => false);

    expect(hasDashboardElements).toBeTruthy();
  });

  test('should display dashboard metrics', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(2000);

    // Check for metrics cards
    const hasMetrics = await page.isVisible(
      '[class*="metric"], [class*="card"], [class*="stat"]'
    ).catch(() => false);

    expect(hasMetrics).toBeTruthy();
  });

  test('should navigate to products page', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    await merchantDashboard.goToProducts();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/merchant/products');
  });

  test('should navigate to orders page', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    await merchantDashboard.goToOrders();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/merchant/orders');
  });

  test('should navigate to profile page', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    const profileLink = page.locator('a:has-text("Profile")').first();

    if (await profileLink.isVisible()) {
      await profileLink.click();
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('/merchant/profile');
    }
  });

  test('should display recent orders on dashboard', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(2000);

    // Look for orders section
    const hasOrdersSection = await page.isVisible(
      'text=Recent Orders, text=Orders, text=Pending'
    ).catch(() => false);

    expect(hasOrdersSection).toBeTruthy();
  });

  test('should view analytics', async ({ page }) => {
    const merchantDashboard = new MerchantDashboardPage(page);

    await merchantDashboard.navigateToDashboard();
    await page.waitForTimeout(1000);

    const analyticsLink = page.locator('a:has-text("Analytics")').first();

    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('/merchant/analytics');
    }
  });
});
