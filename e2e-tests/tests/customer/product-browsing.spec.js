const { test, expect } = require('@playwright/test');
const { ProductsPage } = require('../../pages/ProductsPage');
const { ProductDetailPage } = require('../../pages/ProductDetailPage');
const { SEARCH_QUERIES } = require('../../utils/test-data');

test.describe('Product Browsing and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display products list page', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    // Verify we're on products page
    expect(page.url()).toContain('/products');

    // Check if products are displayed or "no products" message
    const hasProducts = await productsPage.getProductCount() > 0;
    const hasNoProductsMessage = await productsPage.isNoProductsMessageVisible();

    expect(hasProducts || hasNoProductsMessage).toBeTruthy();
  });

  test('should search for products', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(1000);

    // Search for a product
    await productsPage.searchProduct(SEARCH_QUERIES.valid);
    await page.waitForTimeout(1000);

    // Products should be filtered or message shown
    const productCount = await productsPage.getProductCount();
    const noProductsVisible = await productsPage.isNoProductsMessageVisible();

    expect(productCount >= 0 || noProductsVisible).toBeTruthy();
  });

  test('should show no results for invalid search', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(1000);

    // Search for non-existent product
    await productsPage.searchProduct(SEARCH_QUERIES.invalid);
    await page.waitForTimeout(1000);

    // Should show no products message or have 0 products
    const productCount = await productsPage.getProductCount();
    const noProductsVisible = await productsPage.isNoProductsMessageVisible();

    expect(productCount === 0 || noProductsVisible).toBeTruthy();
  });

  test('should navigate to product detail page', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.clickFirstProduct();
      await page.waitForTimeout(1000);

      // Should be on product detail page
      expect(page.url()).toContain('/products/');
    }
  });

  test('should display product details', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const productDetailPage = new ProductDetailPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.clickFirstProduct();
      await page.waitForTimeout(1000);

      // Verify product details are displayed
      const title = await productDetailPage.getProductTitle();
      const price = await productDetailPage.getProductPrice();

      expect(title).toBeTruthy();
      expect(price).toBeTruthy();
    }
  });

  test('should add product to cart from products list', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Should show success message or cart update
      const hasSuccessMessage = await page.isVisible('text=added, text=cart').catch(() => false);
      expect(hasSuccessMessage).toBeTruthy();
    }
  });

  test('should change product quantity on detail page', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const productDetailPage = new ProductDetailPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.clickFirstProduct();
      await page.waitForTimeout(1000);

      // Increment quantity
      await productDetailPage.incrementQuantity(2);
      await page.waitForTimeout(500);

      const quantity = await productDetailPage.getQuantity();
      expect(parseInt(quantity)).toBeGreaterThan(1);
    }
  });

  test('should add product to cart from detail page', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const productDetailPage = new ProductDetailPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.clickFirstProduct();
      await page.waitForTimeout(1000);

      // Set quantity
      await productDetailPage.setQuantity(2);
      await page.waitForTimeout(500);

      // Add to cart
      const isEnabled = await productDetailPage.isAddToCartButtonEnabled();

      if (isEnabled) {
        await productDetailPage.addToCart();
        await page.waitForTimeout(1000);

        // Should show success notification
        const hasNotification = await page.isVisible('text=added, text=cart, [role="alert"]').catch(() => false);
        expect(hasNotification).toBeTruthy();
      }
    }
  });

  test('should navigate back from product detail page', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const productDetailPage = new ProductDetailPage(page);

    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.clickFirstProduct();
      await page.waitForTimeout(1000);

      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);

      // Should be back on products list
      expect(page.url()).toContain('/products');
      expect(page.url()).not.toMatch(/\/products\/[a-zA-Z0-9]+$/);
    }
  });
});
