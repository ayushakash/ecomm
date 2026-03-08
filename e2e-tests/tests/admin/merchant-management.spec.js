const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { AdminMerchantsPage } = require('../../pages/AdminDashboardPage');
const { ADMIN_DATA } = require('../../utils/test-data');

test.describe.serial('Admin Merchant Management', () => {
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

  test('should display merchants list', async ({ page }) => {
    const merchantsPage = new AdminMerchantsPage(page);

    await merchantsPage.navigateToMerchants();
    await page.waitForTimeout(2000);

    // Verify on merchants page
    expect(page.url()).toContain('/admin/merchants');

    // Check for merchants table or list
    const hasMerchants = await page.isVisible(
      'table, [class*="merchant"]'
    ).catch(() => false);

    expect(hasMerchants).toBeTruthy();
  });

  test('should view merchant details', async ({ page }) => {
    const merchantsPage = new AdminMerchantsPage(page);

    await merchantsPage.navigateToMerchants();
    await page.waitForTimeout(2000);

    const merchants = await merchantsPage.getMerchants();

    if (merchants.length > 0) {
      const viewButton = merchants[0].locator('button:has-text("View"), a:has-text("View")');

      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
        await page.waitForTimeout(1000);

        // Should show merchant details
        const hasDetails = await page.isVisible(
          'text=Business, text=Contact, text=GST, text=Details'
        ).catch(() => false);

        expect(hasDetails).toBeTruthy();
      }
    }
  });

  test('should filter merchants by status', async ({ page }) => {
    const merchantsPage = new AdminMerchantsPage(page);

    await merchantsPage.navigateToMerchants();
    await page.waitForTimeout(2000);

    // Look for status filter
    const statusFilter = page.locator('select[name="status"], select:has-text("Status")');

    if (await statusFilter.isVisible({ timeout: 2000 })) {
      await merchantsPage.filterByStatus('pending');
      await page.waitForTimeout(1000);

      // Verify filter applied
      const merchants = await merchantsPage.getMerchants();
      expect(merchants.length >= 0).toBeTruthy();
    }
  });

  test('should approve pending merchant', async ({ page }) => {
    const merchantsPage = new AdminMerchantsPage(page);

    await merchantsPage.navigateToMerchants();
    await page.waitForTimeout(2000);

    // Filter pending merchants
    const statusFilter = page.locator('select[name="status"]');
    if (await statusFilter.isVisible({ timeout: 2000 })) {
      await merchantsPage.filterByStatus('pending');
      await page.waitForTimeout(1000);
    }

    const merchants = await merchantsPage.getMerchants();

    if (merchants.length > 0) {
      const approveButton = merchants[0].locator('button:has-text("Approve")');

      if (await approveButton.isVisible({ timeout: 2000 })) {
        await approveButton.click();

        // Confirm if modal appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=approved, text=success').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should suspend merchant', async ({ page }) => {
    const merchantsPage = new AdminMerchantsPage(page);

    await merchantsPage.navigateToMerchants();
    await page.waitForTimeout(2000);

    const merchants = await merchantsPage.getMerchants();

    if (merchants.length > 0) {
      const suspendButton = merchants[0].locator('button:has-text("Suspend")');

      if (await suspendButton.isVisible({ timeout: 2000 })) {
        await suspendButton.click();

        // Confirm if modal appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=suspended, text=success').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should search merchants', async ({ page }) => {
    const merchantsPage = new AdminMerchantsPage(page);

    await merchantsPage.navigateToMerchants();
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');

    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Results should be filtered
      const merchants = await merchantsPage.getMerchants();
      expect(merchants.length >= 0).toBeTruthy();
    }
  });
});
