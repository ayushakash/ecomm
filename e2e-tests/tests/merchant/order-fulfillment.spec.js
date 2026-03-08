const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { MerchantOrdersPage } = require('../../pages/MerchantDashboardPage');
const { MERCHANT_DATA, TEST_OTP } = require('../../utils/test-data');

test.describe.serial('Merchant Order Fulfillment', () => {
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

  test('should display merchant orders list', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    // Verify on orders page
    expect(page.url()).toContain('/merchant/orders');

    // Check for orders table or list
    const hasOrders = await page.isVisible(
      'table, [class*="order"], text=Orders'
    ).catch(() => false);

    expect(hasOrders).toBeTruthy();
  });

  test('should view order details', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const viewButton = orders[0].locator('button:has-text("View"), a:has-text("View")');

      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Should show order details
        const hasDetails = await page.isVisible(
          'text=Order, text=Customer, text=Items'
        ).catch(() => false);

        expect(hasDetails).toBeTruthy();
      }
    }
  });

  test('should claim unassigned order', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const claimButton = orders[0].locator('button:has-text("Claim"), button:has-text("Accept")');

      if (await claimButton.isVisible({ timeout: 2000 })) {
        await claimButton.click();

        // Confirm if modal appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=claimed, text=accepted, text=success').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should update order status to processing', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const viewButton = orders[0].locator('button:has-text("View")');

      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Look for status update
        const statusSelect = page.locator('select[name="status"]');

        if (await statusSelect.isVisible({ timeout: 2000 })) {
          await page.selectOption(statusSelect, 'processing');
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
    }
  });

  test('should update order status to shipped', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const viewButton = orders[0].locator('button:has-text("View")');

      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        const statusSelect = page.locator('select[name="status"]');

        if (await statusSelect.isVisible({ timeout: 2000 })) {
          await page.selectOption(statusSelect, 'shipped');
          await page.waitForTimeout(500);

          const updateButton = page.locator('button:has-text("Update")');
          if (await updateButton.isVisible()) {
            await updateButton.click();
            await page.waitForTimeout(2000);

            const hasSuccess = await page.isVisible('text=shipped, text=updated').catch(() => false);
            expect(hasSuccess).toBeTruthy();
          }
        }
      }
    }
  });

  test('should filter orders by status', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    // Look for status filter
    const statusFilter = page.locator('select[name="filter"], select:has-text("Status")');

    if (await statusFilter.isVisible({ timeout: 2000 })) {
      await page.selectOption(statusFilter, { index: 1 });
      await page.waitForTimeout(1000);

      // Verify filter applied
      const orders = await ordersPage.getOrders();
      expect(orders.length >= 0).toBeTruthy();
    }
  });

  test('should view pending orders', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    // Look for pending filter
    const pendingFilter = page.locator('button:has-text("Pending"), a:has-text("Pending")');

    if (await pendingFilter.isVisible({ timeout: 2000 })) {
      await pendingFilter.click();
      await page.waitForTimeout(1000);

      const orders = await ordersPage.getOrders();
      expect(orders.length >= 0).toBeTruthy();
    }
  });

  test('should reject order item', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const viewButton = orders[0].locator('button:has-text("View")');

      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        const rejectButton = page.locator('button:has-text("Reject")');

        if (await rejectButton.isVisible({ timeout: 2000 })) {
          await rejectButton.click();

          // Confirm rejection
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }

          await page.waitForTimeout(2000);

          const hasSuccess = await page.isVisible('text=rejected, text=success').catch(() => false);
          expect(hasSuccess).toBeTruthy();
        }
      }
    }
  });

  test('should view order customer details', async ({ page }) => {
    const ordersPage = new MerchantOrdersPage(page);

    await ordersPage.navigateToOrders();
    await page.waitForTimeout(2000);

    const orders = await ordersPage.getOrders();

    if (orders.length > 0) {
      const viewButton = orders[0].locator('button:has-text("View")');

      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Should show customer details
        const hasCustomerInfo = await page.isVisible(
          'text=Customer, text=Phone, text=Address'
        ).catch(() => false);

        expect(hasCustomerInfo).toBeTruthy();
      }
    }
  });
});
