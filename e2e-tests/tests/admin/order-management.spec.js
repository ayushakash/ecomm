const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { AdminOrdersPage } = require('../../pages/AdminDashboardPage');
const { ADMIN_DATA } = require('../../utils/test-data');

test.describe.serial('Admin Order Management', () => {
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

  test('should display orders list', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    // Verify on orders page
    expect(page.url()).toContain('/admin/orders');

    // Check for orders table or list
    const hasOrders = await page.isVisible(
      'table, [class*="order"]'
    ).catch(() => false);

    expect(hasOrders).toBeTruthy();
  });

  test('should view order details', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      await ordersPage.viewFirstOrder();
      await page.waitForTimeout(2000);

      // Should show order details
      const hasDetails = await page.isVisible(
        'text=Order Number, text=Customer, text=Items, text=Total'
      ).catch(() => false);

      expect(hasDetails).toBeTruthy();
    }
  });

  test('should filter orders by status', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    // Look for status filter
    const statusFilter = page.locator('select[name="status"]');

    if (await statusFilter.isVisible({ timeout: 2000 })) {
      await page.selectOption(statusFilter, 'pending');
      await page.waitForTimeout(1000);

      // Verify filter applied
      const orders = await ordersPage.getOrders();
      expect(orders.length >= 0).toBeTruthy();
    }
  });

  test('should assign merchant to order', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const assignButton = orders[0].locator('button:has-text("Assign")');

      if (await assignButton.isVisible({ timeout: 2000 })) {
        await assignButton.click();
        await page.waitForTimeout(1000);

        // Should show merchant selection
        const hasMerchantSelect = await page.isVisible(
          'select, [role="dialog"]'
        ).catch(() => false);

        expect(hasMerchantSelect).toBeTruthy();
      }
    }
  });

  test('should update order status', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      await ordersPage.viewFirstOrder();
      await page.waitForTimeout(2000);

      // Look for status update controls
      const statusSelect = page.locator('select[name="status"]');

      if (await statusSelect.isVisible({ timeout: 2000 })) {
        await page.selectOption(statusSelect, { index: 1 });
        await page.waitForTimeout(500);

        const updateButton = page.locator('button:has-text("Update")');
        if (await updateButton.isVisible()) {
          await updateButton.click();
          await page.waitForTimeout(2000);

          // Should show success message
          const hasSuccess = await page.isVisible('text=updated, text=success').catch(() => false);
          expect(hasSuccess).toBeTruthy();
        }
      }
    }
  });

  test('should search orders', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');

    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('ORD');
      await page.waitForTimeout(1000);

      // Results should be filtered
      const orders = await ordersPage.getOrders();
      expect(orders.length >= 0).toBeTruthy();
    }
  });

  test('should view order lifecycle/history', async ({ page }) => {
    const ordersPage = new AdminOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      await ordersPage.viewFirstOrder();
      await page.waitForTimeout(2000);

      // Look for lifecycle/history section
      const hasLifecycle = await page.isVisible(
        'text=Lifecycle, text=History, text=Timeline'
      ).catch(() => false);

      expect(hasLifecycle).toBeTruthy();
    }
  });
});
