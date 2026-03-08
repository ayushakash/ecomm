const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { RegisterPage } = require('../../pages/RegisterPage');
const { generateRandomPhone } = require('../../utils/helpers');
const { TEST_OTP, CUSTOMER_DATA } = require('../../utils/test-data');

test.describe('Customer Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should successfully login as customer with OTP', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();
    await loginPage.enterPhoneNumber(CUSTOMER_DATA.phone);
    await loginPage.clickSendOTP();

    // Wait for OTP to be sent
    await page.waitForTimeout(1000);

    await loginPage.enterOTP(TEST_OTP);
    await loginPage.clickVerifyOTP();

    // Verify successful login - check for redirect to home or profile
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');

    // Check if user is logged in - look for logout button or user menu
    const isLoggedIn = await page.isVisible('text=Logout, text=Profile').catch(() => false);
    expect(isLoggedIn).toBeTruthy();
  });

  test('should successfully register new customer', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const randomPhone = generateRandomPhone();

    await registerPage.registerCustomer(
      'Test User ' + Date.now(),
      randomPhone,
      TEST_OTP
    );

    // Verify successful registration
    await page.waitForTimeout(2000);

    // Should be redirected after successful registration
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/register');
  });

  test('should show error for invalid OTP', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();
    await loginPage.enterPhoneNumber(CUSTOMER_DATA.phone);
    await loginPage.clickSendOTP();
    await page.waitForTimeout(1000);

    // Enter wrong OTP
    await loginPage.enterOTP('9999');
    await loginPage.clickVerifyOTP();
    await page.waitForTimeout(1000);

    // Should show error message or remain on login page
    const errorMessage = await loginPage.getErrorMessage();
    const stillOnLoginPage = page.url().includes('/login');

    expect(errorMessage !== null || stillOnLoginPage).toBeTruthy();
  });

  test('should navigate to register page from login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();

    // Look for register link and click it
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign up")').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('register');
    }
  });

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login first
    await loginPage.loginAsCustomer(CUSTOMER_DATA.phone, TEST_OTP);
    await page.waitForTimeout(2000);

    // Logout
    await loginPage.logout();
    await page.waitForTimeout(1000);

    // Should be redirected to home or login page
    const currentUrl = page.url();
    expect(currentUrl.includes('/login') || currentUrl.endsWith('/')).toBeTruthy();
  });

  test('should validate phone number format', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();

    // Try invalid phone number
    await loginPage.enterPhoneNumber('123');

    // Check if send OTP button is disabled or shows validation error
    const sendOTPButton = page.locator('button:has-text("Send OTP")');
    const isEnabled = await sendOTPButton.isEnabled();

    // Either button should be disabled or validation message should appear
    if (isEnabled) {
      await sendOTPButton.click();
      await page.waitForTimeout(500);

      // Check for validation message
      const hasError = await page.isVisible('[role="alert"], .error, .invalid').catch(() => false);
      expect(hasError).toBeTruthy();
    } else {
      expect(isEnabled).toBeFalsy();
    }
  });
});
