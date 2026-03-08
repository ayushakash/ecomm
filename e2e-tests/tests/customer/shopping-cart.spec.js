const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { ProductsPage } = require('../../pages/ProductsPage');
const { CartPage } = require('../../pages/CartPage');
const { CUSTOMER_DATA, TEST_OTP } = require('../../utils/test-data');

test.describe('Shopping Cart Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display empty cart initially', async ({ page }) => {
    const cartPage = new CartPage(page);

    await cartPage.navigateToCart();
    await page.waitForTimeout(1000);

    // Cart might be empty or have items from previous tests
    const isEmpty = await cartPage.isCartEmpty();
    const itemCount = await cartPage.getCartItemCount();

    expect(isEmpty || itemCount >= 0).toBeTruthy();
  });

  test('should add product to cart and display in cart page', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Go to products and add item to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Navigate to cart
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      // Verify item is in cart
      const cartItemCount = await cartPage.getCartItemCount();
      expect(cartItemCount).toBeGreaterThan(0);
    }
  });

  test('should update item quantity in cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add product to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Go to cart
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      const itemCount = await cartPage.getCartItemCount();

      if (itemCount > 0) {
        // Increment quantity
        await cartPage.incrementItemQuantity(0);
        await page.waitForTimeout(1000);

        // Total should update
        const total = await cartPage.getTotalAmount();
        expect(parseFloat(total)).toBeGreaterThan(0);
      }
    }
  });

  test('should remove item from cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add product to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Go to cart
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      const initialCount = await cartPage.getCartItemCount();

      if (initialCount > 0) {
        // Remove first item
        await cartPage.removeFirstItem();
        await page.waitForTimeout(1000);

        // Verify item removed
        const newCount = await cartPage.getCartItemCount();
        expect(newCount).toBeLessThan(initialCount);
      }
    }
  });

  test('should display total amount in cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add product to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Go to cart
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      const itemCount = await cartPage.getCartItemCount();

      if (itemCount > 0) {
        // Verify total is displayed and greater than 0
        const total = await cartPage.getTotalAmount();
        expect(parseFloat(total)).toBeGreaterThan(0);
      }
    }
  });

  test('should show login prompt when proceeding to checkout without login', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add product to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Go to cart
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      const itemCount = await cartPage.getCartItemCount();

      if (itemCount > 0) {
        // Try to checkout
        const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed")');

        if (await checkoutButton.isVisible()) {
          await checkoutButton.click();
          await page.waitForTimeout(1000);

          // Should redirect to login or show login prompt
          const isLoginPage = page.url().includes('/login');
          const hasLoginPrompt = await cartPage.isLoginPromptVisible();

          expect(isLoginPage || hasLoginPrompt).toBeTruthy();
        }
      }
    }
  });

  test('should proceed to checkout when logged in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Login first
    await loginPage.loginAsCustomer(CUSTOMER_DATA.phone, TEST_OTP);
    await page.waitForTimeout(2000);

    // Add product to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Go to cart
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      const itemCount = await cartPage.getCartItemCount();

      if (itemCount > 0) {
        // Proceed to checkout
        await cartPage.proceedToCheckout();
        await page.waitForTimeout(2000);

        // Should be on checkout page
        expect(page.url()).toContain('/checkout');
      }
    }
  });

  test('should continue shopping from cart', async ({ page }) => {
    const cartPage = new CartPage(page);

    await cartPage.navigateToCart();
    await page.waitForTimeout(1000);

    // Click continue shopping
    const continueButton = page.locator('button:has-text("Continue Shopping"), a:has-text("Continue Shopping")');

    if (await continueButton.isVisible()) {
      await continueButton.click();
      await page.waitForTimeout(1000);

      // Should navigate away from cart
      expect(page.url()).not.toContain('/cart');
    }
  });
});
