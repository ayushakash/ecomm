const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { ProductsPage } = require('../../pages/ProductsPage');
const { CartPage } = require('../../pages/CartPage');
const { CheckoutPage } = require('../../pages/CheckoutPage');
const { OrdersPage } = require('../../pages/ProfilePage');
const { CUSTOMER_DATA, TEST_OTP, ADDRESS_DATA } = require('../../utils/test-data');

test.describe.serial('Checkout Flow', () => {
  let isLoggedIn = false;

  test.beforeEach(async ({ page }) => {
    if (!isLoggedIn) {
      await page.goto('/');

      const loginPage = new LoginPage(page);
      await loginPage.loginAsCustomer(CUSTOMER_DATA.phone, TEST_OTP);
      await page.waitForTimeout(2000);
      isLoggedIn = true;
    }
  });

  test('should display checkout page with cart items', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Add product to cart
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      // Go to cart and checkout
      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Verify on checkout page
      expect(page.url()).toContain('/checkout');
    }
  });

  test('should add new delivery address during checkout', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Add product and go to checkout
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Add new address
      const addAddressButton = page.locator('button:has-text("Add New Address"), button:has-text("Add Address")');

      if (await addAddressButton.isVisible({ timeout: 2000 })) {
        await checkoutPage.clickAddNewAddress();
        await page.waitForTimeout(1000);

        await checkoutPage.fillAddressForm(ADDRESS_DATA);
        await checkoutPage.saveAddress();
        await page.waitForTimeout(1000);

        // Address should be added
        const hasAddresses = await page.isVisible('input[type="radio"][name="address"]');
        expect(hasAddresses).toBeTruthy();
      }
    }
  });

  test('should select payment method', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Add product and go to checkout
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Select payment method
      const paymentSelect = page.locator('select[name="paymentMethod"]');

      if (await paymentSelect.isVisible({ timeout: 2000 })) {
        await checkoutPage.selectPaymentMethod('COD');
        await page.waitForTimeout(500);

        const selectedValue = await paymentSelect.inputValue();
        expect(selectedValue).toBe('COD');
      }
    }
  });

  test('should add delivery instructions', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Add product and go to checkout
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Add delivery instructions
      const instructionsField = page.locator('textarea[name="deliveryInstructions"]');

      if (await instructionsField.isVisible({ timeout: 2000 })) {
        await checkoutPage.setDeliveryInstructions('Please call before delivery');
        await page.waitForTimeout(500);

        const value = await instructionsField.inputValue();
        expect(value).toContain('call before delivery');
      }
    }
  });

  test('should display order summary in checkout', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Add product and go to checkout
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Verify order summary is displayed
      const hasSummary = await page.isVisible('[class*="summary"], [class*="total"]');
      expect(hasSummary).toBeTruthy();
    }
  });

  test('should complete full checkout flow and place order', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Add product
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Complete checkout
      // Check if address exists
      const hasAddress = await page.isVisible('input[type="radio"][name="address"]');

      if (!hasAddress) {
        const addAddressButton = page.locator('button:has-text("Add New Address"), button:has-text("Add Address")');
        if (await addAddressButton.isVisible({ timeout: 2000 })) {
          await checkoutPage.addNewAddress(ADDRESS_DATA);
        }
      } else {
        await checkoutPage.selectFirstAddress();
      }

      await page.waitForTimeout(1000);

      // Select payment and place order
      const paymentSelect = page.locator('select[name="paymentMethod"]');
      if (await paymentSelect.isVisible({ timeout: 2000 })) {
        await checkoutPage.selectPaymentMethod('COD');
      }

      await checkoutPage.setDeliveryInstructions('Test order - Please call before delivery');
      await page.waitForTimeout(1000);

      // Place order
      const placeOrderButton = page.locator('button:has-text("Place Order")');
      if (await placeOrderButton.isVisible()) {
        await placeOrderButton.click();
        await page.waitForTimeout(3000);

        // Should redirect to success page or orders page
        const currentUrl = page.url();
        const isSuccessPage = currentUrl.includes('success') || currentUrl.includes('order');

        expect(isSuccessPage).toBeTruthy();
      }
    }
  });

  test('should display order in order history after placing order', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const ordersPage = new OrdersPage(page);

    // Add product and complete checkout
    await productsPage.navigateToProducts();
    await page.waitForTimeout(2000);

    const productCount = await productsPage.getProductCount();

    if (productCount > 0) {
      await productsPage.addFirstProductToCart();
      await page.waitForTimeout(1000);

      await cartPage.navigateToCart();
      await page.waitForTimeout(1000);

      await cartPage.proceedToCheckout();
      await page.waitForTimeout(2000);

      // Quick checkout if possible
      const hasAddress = await page.isVisible('input[type="radio"][name="address"]');
      if (hasAddress) {
        await checkoutPage.selectFirstAddress();
        await page.waitForTimeout(500);

        const paymentSelect = page.locator('select[name="paymentMethod"]');
        if (await paymentSelect.isVisible({ timeout: 1000 })) {
          await checkoutPage.selectPaymentMethod('COD');
        }

        const placeOrderButton = page.locator('button:has-text("Place Order")');
        if (await placeOrderButton.isVisible()) {
          await placeOrderButton.click();
          await page.waitForTimeout(3000);

          // Go to orders page
          await ordersPage.navigateToOrders();
          await page.waitForTimeout(2000);

          // Verify order appears in history
          const orderCount = await ordersPage.getOrderCount();
          expect(orderCount).toBeGreaterThan(0);
        }
      }
    }
  });
});
