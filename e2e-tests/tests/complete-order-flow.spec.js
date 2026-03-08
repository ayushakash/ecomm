/**
 * Complete E2E Order Flow Test
 *
 * Test Flow:
 * 1. Login as customer (6201176610)
 * 2. Add product to cart and place order
 * 3. Login as merchant (9431171468)
 * 4. Accept the order
 * 5. Verify revenue in payouts
 */

const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { ProductsPage } = require('../pages/ProductsPage');
const { CartPage } = require('../pages/CartPage');
const { CheckoutPage } = require('../pages/CheckoutPage');
const { MerchantOrdersPage } = require('../pages/MerchantDashboardPage');
const { MerchantPayoutsPage } = require('../pages/MerchantPayoutsPage');
const { TEST_OTP } = require('../utils/test-data');
const { wait } = require('../utils/helpers');

// Test data
const CUSTOMER_PHONE = '6201176610';
const MERCHANT_PHONE = '9431171468';

test.describe('Complete Order Flow E2E', () => {
  test.setTimeout(180000); // 3 minutes timeout for complete flow

  test('should complete full order flow from customer to merchant with revenue verification', async ({ page }) => {
    // =====================================
    // PHASE 1: Customer Login & Order Placement
    // =====================================
    console.log('\n🔵 PHASE 1: Customer Login & Order Placement');

    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Step 1: Login as customer
    console.log('📱 Logging in as customer:', CUSTOMER_PHONE);
    await loginPage.navigateToLogin();
    await loginPage.enterPhoneNumber(CUSTOMER_PHONE);
    await loginPage.clickSendOTP();
    await wait(1000);
    await loginPage.enterOTP(TEST_OTP);
    await loginPage.clickVerifyOTP();
    await wait(2000);

    // Verify customer login successful
    await expect(page).toHaveURL(/\/(products|dashboard|home)/);
    console.log('✅ Customer logged in successfully');

    // Step 2: Navigate to products and add to cart
    console.log('🛍️ Browsing products...');
    await productsPage.navigateToProducts();
    await wait(1000);

    // Find and click on first available product
    const productCards = await page.locator('[class*="product-card"], [class*="ProductCard"]').all();
    expect(productCards.length).toBeGreaterThan(0);
    console.log(`📦 Found ${productCards.length} products`);

    // Click first product to view details
    await productCards[0].click();
    await wait(1000);

    // Get product name and price
    const productName = await page.locator('h1, h2, [class*="product-name"]').first().textContent();
    console.log(`📝 Selected product: ${productName}`);

    // Add to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await expect(addToCartButton).toBeVisible({ timeout: 5000 });
    await addToCartButton.click();
    await wait(1000);
    console.log('✅ Added product to cart');

    // Step 3: Go to cart
    console.log('🛒 Navigating to cart...');
    await cartPage.navigateToCart();
    await wait(1000);

    // Verify cart has items
    const cartItems = await page.locator('[class*="cart-item"]').count();
    expect(cartItems).toBeGreaterThan(0);
    console.log(`✅ Cart has ${cartItems} item(s)`);

    // Get cart total before checkout
    const cartTotalText = await page.locator('text=/Total.*₹/i').last().textContent();
    const cartTotal = parseFloat(cartTotalText.match(/₹([\d,]+\.?\d*)/)[1].replace(/,/g, ''));
    console.log(`💰 Cart total: ₹${cartTotal.toFixed(2)}`);

    // Step 4: Proceed to checkout
    console.log('💳 Proceeding to checkout...');
    await checkoutPage.navigateToCheckout();
    await wait(2000);

    // Fill address if needed
    const addressSection = page.locator('[class*="address"], input[name="address"]');
    if (await addressSection.isVisible({ timeout: 3000 })) {
      console.log('📍 Filling address details...');

      // Check if we need to select existing address or fill new one
      const selectAddressButton = page.locator('button:has-text("Select Address"), input[type="radio"][name="address"]');
      if (await selectAddressButton.first().isVisible({ timeout: 2000 })) {
        // Select first existing address
        await selectAddressButton.first().click();
        console.log('✅ Selected existing address');
      } else {
        // Fill new address
        await page.fill('input[name="fullName"], input[placeholder*="Name"]', 'Test Customer');
        await page.fill('input[name="phoneNumber"], input[placeholder*="Phone"]', CUSTOMER_PHONE);
        await page.fill('input[name="addressLine1"], textarea[placeholder*="Address"]', '123 Test Street');
        await page.fill('input[name="area"], input[placeholder*="Area"]', 'Test Area');
        await page.fill('input[name="city"], input[placeholder*="City"]', 'Mumbai');
        await page.fill('input[name="state"], input[placeholder*="State"]', 'Maharashtra');
        await page.fill('input[name="pincode"], input[placeholder*="Pincode"]', '400001');
        console.log('✅ Filled new address');
      }
      await wait(1000);
    }

    // Place order
    console.log('🎯 Placing order...');
    const placeOrderButton = page.locator('button:has-text("Place Order"), button:has-text("Confirm Order")');
    await expect(placeOrderButton).toBeVisible({ timeout: 5000 });
    await placeOrderButton.click();
    await wait(3000);

    // Verify order success
    const orderSuccessMessage = page.locator('text=/Order.*success/i, text=/Thank you/i');
    await expect(orderSuccessMessage).toBeVisible({ timeout: 10000 });

    // Extract order number
    const orderNumberText = await page.locator('text=/Order.*#.*ORD/i').first().textContent();
    const orderNumber = orderNumberText.match(/(ORD\d+)/)[1];
    console.log(`✅ Order placed successfully! Order #${orderNumber}`);

    // Store order details for verification
    const orderTotal = cartTotal;

    // Logout customer
    await loginPage.logout();
    await wait(1000);
    console.log('👋 Customer logged out');

    // =====================================
    // PHASE 2: Merchant Login & Order Acceptance
    // =====================================
    console.log('\n🟢 PHASE 2: Merchant Login & Order Acceptance');

    const merchantOrdersPage = new MerchantOrdersPage(page);
    const merchantPayoutsPage = new MerchantPayoutsPage(page);

    // Step 5: Login as merchant
    console.log('📱 Logging in as merchant:', MERCHANT_PHONE);
    await loginPage.navigateToLogin();
    await loginPage.enterPhoneNumber(MERCHANT_PHONE);
    await loginPage.clickSendOTP();
    await wait(1000);
    await loginPage.enterOTP(TEST_OTP);
    await loginPage.clickVerifyOTP();
    await wait(2000);

    // Verify merchant login successful
    await expect(page).toHaveURL(/\/merchant/);
    console.log('✅ Merchant logged in successfully');

    // Step 6: Navigate to orders
    console.log('📋 Navigating to merchant orders...');
    await merchantOrdersPage.navigateToOrders();
    await wait(2000);

    // Find the order we just placed
    console.log(`🔍 Looking for order ${orderNumber}...`);
    const orderCard = page.locator(`text=${orderNumber}`).locator('..');

    // Wait for order to appear (may take a moment)
    let orderFound = false;
    for (let i = 0; i < 5; i++) {
      if (await orderCard.isVisible({ timeout: 2000 })) {
        orderFound = true;
        break;
      }
      console.log(`⏳ Waiting for order to appear... (attempt ${i + 1}/5)`);
      await page.reload();
      await wait(2000);
    }

    expect(orderFound).toBe(true);
    console.log(`✅ Found order ${orderNumber}`);

    // Step 7: Accept/Assign the order
    console.log('👍 Accepting order...');

    // Look for Accept/Assign/Claim button
    const acceptButton = page.locator(`text=${orderNumber}`).locator('..').locator('button:has-text("Accept"), button:has-text("Assign"), button:has-text("Claim")').first();

    if (await acceptButton.isVisible({ timeout: 3000 })) {
      await acceptButton.click();
      await wait(1000);

      // Handle confirmation modal if present
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Accept Order")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        console.log('✅ Confirmed order acceptance');
      }

      await wait(2000);
      console.log('✅ Order accepted successfully');
    } else {
      console.log('ℹ️ Order may already be assigned');
    }

    // =====================================
    // PHASE 3: Revenue Verification
    // =====================================
    console.log('\n💰 PHASE 3: Revenue Verification');

    // Step 8: Navigate to payouts
    console.log('💵 Navigating to payouts page...');
    await merchantPayoutsPage.navigateToPayouts();
    await wait(2000);

    // Find the order in payouts
    console.log(`🔍 Looking for order ${orderNumber} in payouts...`);
    const payoutOrderCard = page.locator(`text=${orderNumber}`).locator('..');
    await expect(payoutOrderCard).toBeVisible({ timeout: 5000 });
    console.log(`✅ Found order ${orderNumber} in payouts`);

    // Extract revenue details
    const netPayoutText = await payoutOrderCard.locator('text=/Net.*Payout|You.*Receive|Merchant.*Gets/i').locator('..').locator('text=/₹[\d,]+/').textContent();
    const netPayout = parseFloat(netPayoutText.match(/₹([\d,]+\.?\d*)/)[1].replace(/,/g, ''));
    console.log(`💰 Net Payout: ₹${netPayout.toFixed(2)}`);

    const owePlatformText = await payoutOrderCard.locator('text=/Owe.*Platform|Platform.*Fee|Remit/i').locator('..').locator('text=/₹[\d,]+/').textContent();
    const owePlatform = parseFloat(owePlatformText.match(/₹([\d,]+\.?\d*)/)[1].replace(/,/g, ''));
    console.log(`🏢 Owe Platform: ₹${owePlatform.toFixed(2)}`);

    const codCollectionText = await payoutOrderCard.locator('text=/COD.*Collect|Collect.*Customer|Total.*Amount/i').locator('..').locator('text=/₹[\d,]+/').textContent();
    const codCollection = parseFloat(codCollectionText.match(/₹([\d,]+\.?\d*)/)[1].replace(/,/g, ''));
    console.log(`💵 COD Collection: ₹${codCollection.toFixed(2)}`);

    // Verify calculation: COD Collection - Owe Platform = Net Payout
    const calculatedNetPayout = codCollection - owePlatform;
    expect(Math.abs(calculatedNetPayout - netPayout)).toBeLessThan(1); // Allow ₹1 rounding difference
    console.log(`✅ Payout calculation verified: ₹${codCollection.toFixed(2)} - ₹${owePlatform.toFixed(2)} = ₹${netPayout.toFixed(2)}`);

    // Check if GST breakdown is visible
    const gstBreakdown = payoutOrderCard.locator('text=/GST.*Breakdown|Merchant.*GST|Platform.*GST/i');
    if (await gstBreakdown.isVisible({ timeout: 2000 })) {
      console.log('📊 GST Breakdown:');

      const merchantGSTText = await payoutOrderCard.locator('text=/Merchant.*GST/i').locator('..').locator('text=/₹[\d,]+/').textContent();
      const merchantGST = parseFloat(merchantGSTText.match(/₹([\d,]+\.?\d*)/)[1].replace(/,/g, ''));
      console.log(`  - Merchant GST: ₹${merchantGST.toFixed(2)}`);

      const platformGSTText = await payoutOrderCard.locator('text=/Platform.*GST/i').locator('..').locator('text=/₹[\d,]+/').textContent();
      const platformGST = parseFloat(platformGSTText.match(/₹([\d,]+\.?\d*)/)[1].replace(/,/g, ''));
      console.log(`  - Platform GST: ₹${platformGST.toFixed(2)}`);

      console.log(`✅ Total GST: ₹${(merchantGST + platformGST).toFixed(2)}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Order Number:       ${orderNumber}`);
    console.log(`Customer Total:     ₹${orderTotal.toFixed(2)}`);
    console.log(`COD Collection:     ₹${codCollection.toFixed(2)}`);
    console.log(`Platform Earnings:  ₹${owePlatform.toFixed(2)}`);
    console.log(`Merchant Payout:    ₹${netPayout.toFixed(2)}`);
    console.log('='.repeat(60));
    console.log('✅ COMPLETE ORDER FLOW TEST PASSED!\n');
  });
});
