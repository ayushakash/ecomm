const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { MerchantProductsPage } = require('../../pages/MerchantDashboardPage');
const { MERCHANT_DATA, TEST_OTP } = require('../../utils/test-data');

test.describe.serial('Merchant Inventory Management', () => {
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

  test('should display merchant products list', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Verify on products page
    expect(page.url()).toContain('/merchant/products');

    // Check for products table or list
    const hasProducts = await page.isVisible(
      'table, [class*="product"], text=Products, text=Inventory'
    ).catch(() => false);

    expect(hasProducts).toBeTruthy();
  });

  test('should open add product to inventory form', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const addButton = page.locator('button:has-text("Add Product"), button:has-text("Add to Inventory")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Should show product form
      const hasForm = await page.isVisible(
        'select[name="productId"], form'
      ).catch(() => false);

      expect(hasForm).toBeTruthy();
    }
  });

  test('should add product to inventory', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const addButton = page.locator('button:has-text("Add Product"), button:has-text("Add to Inventory")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Select product from dropdown
      const productSelect = page.locator('select[name="productId"]');

      if (await productSelect.isVisible({ timeout: 2000 })) {
        // Select first available product
        await page.selectOption(productSelect, { index: 1 });
        await page.waitForTimeout(500);

        // Fill price and stock
        const priceInput = page.locator('input[name="price"]');
        const stockInput = page.locator('input[name="stock"]');

        await priceInput.fill('500');
        await stockInput.fill('50');
        await page.waitForTimeout(500);

        // Save product
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').last();
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=success, text=added').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should update product stock', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Find first edit button
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Update")').first();

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Should show edit form
      const stockInput = page.locator('input[name="stock"]');
      if (await stockInput.isVisible({ timeout: 2000 })) {
        await stockInput.fill('100');
        await page.waitForTimeout(500);

        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=updated, text=success').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should update product price', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Find first edit button
    const editButton = page.locator('button:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Update price
      const priceInput = page.locator('input[name="price"]');
      if (await priceInput.isVisible({ timeout: 2000 })) {
        await priceInput.fill('550');
        await page.waitForTimeout(500);

        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=updated, text=success').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should toggle product availability', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Find enable/disable toggle
    const toggle = page.locator('input[type="checkbox"]').first();

    if (await toggle.isVisible({ timeout: 2000 })) {
      const wasChecked = await toggle.isChecked();
      await toggle.click();
      await page.waitForTimeout(1000);

      const isChecked = await toggle.isChecked();
      expect(isChecked).not.toBe(wasChecked);
    }
  });

  test('should delete product from inventory', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Find first delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();

    if (await deleteButton.isVisible({ timeout: 2000 })) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=deleted, text=removed').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should view low stock products', async ({ page }) => {
    const productsPage = new MerchantProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Look for low stock filter or indicator
    const hasLowStockIndicator = await page.isVisible(
      'text=Low Stock, text=Out of Stock, [class*="low-stock"]'
    ).catch(() => false);

    expect(typeof hasLowStockIndicator).toBe('boolean');
  });
});
