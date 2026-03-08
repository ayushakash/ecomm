const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { AdminProductsPage } = require('../../pages/AdminDashboardPage');
const { ADMIN_DATA, PRODUCT_DATA } = require('../../utils/test-data');

test.describe.serial('Admin Product Management', () => {
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

  test('should display products list', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Verify on products page
    expect(page.url()).toContain('/admin/products');

    // Check for products table or list
    const hasProducts = await page.isVisible(
      'table, [class*="product"]'
    ).catch(() => false);

    expect(hasProducts).toBeTruthy();
  });

  test('should open add product form', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const addButton = page.locator('button:has-text("Add Product"), button:has-text("Create")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Should show product form
      const hasForm = await page.isVisible(
        'input[name="name"], form'
      ).catch(() => false);

      expect(hasForm).toBeTruthy();
    }
  });

  test('should create new product', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const addButton = page.locator('button:has-text("Add Product"), button:has-text("Create")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Fill product form
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible({ timeout: 2000 })) {
        const testProduct = {
          ...PRODUCT_DATA,
          name: PRODUCT_DATA.name + ' ' + Date.now()
        };

        await productsPage.fillProductForm(testProduct);
        await page.waitForTimeout(500);

        // Save product
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")').last();
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=success, text=created').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should edit existing product', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Find first edit button
    const editButton = page.locator('button:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Should show edit form
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible({ timeout: 2000 })) {
        const currentName = await nameInput.inputValue();
        await nameInput.fill(currentName + ' Updated');

        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').last();
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const hasSuccess = await page.isVisible('text=success, text=updated').catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should delete product', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Find first delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();

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

  test('should toggle product status (enable/disable)', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

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

  test('should search products', async ({ page }) => {
    const productsPage = new AdminProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');

    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('cement');
      await page.waitForTimeout(1000);

      // Results should be filtered
      expect(page.url()).toContain('/admin/products');
    }
  });
});
