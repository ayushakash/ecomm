const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');
const { ADMIN_DATA } = require('../../utils/test-data');

test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should successfully login as admin with 2FA', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginAsAdmin(
      ADMIN_DATA.phone,
      ADMIN_DATA.otp,
      ADMIN_DATA.email,
      ADMIN_DATA.password
    );

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Should be redirected to admin dashboard
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');

    // Check for admin dashboard elements
    const hasAdminElements = await page.isVisible(
      'text=Dashboard, text=Users, text=Merchants, text=Admin'
    ).catch(() => false);

    expect(hasAdminElements).toBeTruthy();
  });

  test('should complete admin 2FA flow (phone OTP + email/password)', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();

    // Step 1: Enter phone and verify OTP
    await loginPage.enterPhoneNumber(ADMIN_DATA.phone);
    await loginPage.clickSendOTP();
    await page.waitForTimeout(1000);

    await loginPage.enterOTP(ADMIN_DATA.otp);
    await loginPage.clickVerifyOTP();
    await page.waitForTimeout(2000);

    // Step 2: Should show email/password fields
    const hasEmailField = await page.isVisible('input[type="email"]').catch(() => false);
    const hasPasswordField = await page.isVisible('input[type="password"]').catch(() => false);

    expect(hasEmailField || hasPasswordField).toBeTruthy();

    // Complete login
    await loginPage.enterEmail(ADMIN_DATA.email);
    await loginPage.enterPassword(ADMIN_DATA.password);
    await loginPage.clickLogin();

    await page.waitForTimeout(2000);

    // Verify admin login
    expect(page.url()).toContain('/admin');
  });

  test('should reject admin login with wrong email/password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();

    // Complete OTP step
    await loginPage.enterPhoneNumber(ADMIN_DATA.phone);
    await loginPage.clickSendOTP();
    await page.waitForTimeout(1000);

    await loginPage.enterOTP(ADMIN_DATA.otp);
    await loginPage.clickVerifyOTP();
    await page.waitForTimeout(2000);

    // Enter wrong credentials
    await loginPage.enterEmail('wrong@email.com');
    await loginPage.enterPassword('wrongpassword');
    await loginPage.clickLogin();
    await page.waitForTimeout(1000);

    // Should show error or remain on login page
    const errorMessage = await loginPage.getErrorMessage();
    const stillOnLoginPage = !page.url().includes('/admin');

    expect(errorMessage !== null || stillOnLoginPage).toBeTruthy();
  });

  test('should have access to admin navigation after login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginAsAdmin(
      ADMIN_DATA.phone,
      ADMIN_DATA.otp,
      ADMIN_DATA.email,
      ADMIN_DATA.password
    );

    await page.waitForTimeout(3000);

    // Check for admin navigation items
    const hasUsers = await page.isVisible('text=Users').catch(() => false);
    const hasMerchants = await page.isVisible('text=Merchants').catch(() => false);
    const hasProducts = await page.isVisible('text=Products').catch(() => false);

    expect(hasUsers || hasMerchants || hasProducts).toBeTruthy();
  });
});
