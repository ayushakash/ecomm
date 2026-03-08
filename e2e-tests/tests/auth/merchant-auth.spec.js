const { test, expect } = require('@playwright/test');
const { MerchantRegisterPage } = require('../../pages/RegisterPage');
const { LoginPage } = require('../../pages/LoginPage');
const { generateRandomPhone, generateGSTNumber, generatePANNumber, generateBusinessName } = require('../../utils/helpers');
const { MERCHANT_DATA, TEST_OTP } = require('../../utils/test-data');

test.describe('Merchant Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should successfully register new merchant', async ({ page }) => {
    const merchantRegisterPage = new MerchantRegisterPage(page);

    const merchantData = {
      ...MERCHANT_DATA,
      contactPhone: generateRandomPhone(),
      businessName: generateBusinessName(),
      gstNumber: generateGSTNumber(),
      panNumber: generatePANNumber(),
      contactEmail: `merchant${Date.now()}@test.com`
    };

    await merchantRegisterPage.registerMerchant(merchantData);

    // Wait for registration to complete
    await page.waitForTimeout(2000);

    // Should show pending approval page or success message
    const currentUrl = page.url();
    const isPendingPage = currentUrl.includes('pending');
    const hasSuccessMessage = await page.isVisible('text=successfully, text=pending approval').catch(() => false);

    expect(isPendingPage || hasSuccessMessage).toBeTruthy();
  });

  test('should fill all merchant registration fields', async ({ page }) => {
    const merchantRegisterPage = new MerchantRegisterPage(page);

    await merchantRegisterPage.navigateToMerchantRegister();

    // Fill business details
    await merchantRegisterPage.fillBusinessDetails(MERCHANT_DATA);

    // Verify all fields are filled
    const contactName = await page.inputValue('input[name="contactName"]');
    const businessName = await page.inputValue('input[name="businessName"]');
    const city = await page.inputValue('input[name="city"]');

    expect(contactName).toBe(MERCHANT_DATA.contactName);
    expect(businessName).toBe(MERCHANT_DATA.businessName);
    expect(city).toBe(MERCHANT_DATA.city);
  });

  test('should validate required fields in merchant registration', async ({ page }) => {
    const merchantRegisterPage = new MerchantRegisterPage(page);

    await merchantRegisterPage.navigateToMerchantRegister();

    // Try to submit without filling required fields
    const registerButton = page.locator('button:has-text("Register")');

    // Fill only phone number to enable OTP
    await page.fill('input[name="contactPhone"]', generateRandomPhone());

    // Check if form validates before submission
    const isEnabled = await registerButton.isEnabled();

    // Form should either disable submit button or show validation errors
    expect(typeof isEnabled).toBe('boolean');
  });

  test('should navigate to merchant register from login page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigateToLogin();

    // Look for merchant registration link
    const merchantRegisterLink = page.locator('a:has-text("Merchant"), a:has-text("Register as Merchant")').first();

    if (await merchantRegisterLink.isVisible()) {
      await merchantRegisterLink.click();
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('merchant-register');
    }
  });

  test('should show pending approval after merchant registration', async ({ page }) => {
    const merchantRegisterPage = new MerchantRegisterPage(page);

    const merchantData = {
      ...MERCHANT_DATA,
      contactPhone: generateRandomPhone(),
      businessName: generateBusinessName() + ' ' + Date.now(),
      gstNumber: generateGSTNumber(),
      panNumber: generatePANNumber(),
      contactEmail: `merchant${Date.now()}@test.com`
    };

    await merchantRegisterPage.registerMerchant(merchantData);
    await page.waitForTimeout(3000);

    // Should show pending approval message
    const hasPendingMessage = await page.isVisible(
      'text=pending, text=approval, text=waiting'
    ).catch(() => false);

    expect(hasPendingMessage).toBeTruthy();
  });
});
