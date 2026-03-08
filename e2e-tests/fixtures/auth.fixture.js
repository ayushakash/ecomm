const { test as base } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CUSTOMER_DATA, MERCHANT_DATA, ADMIN_DATA } = require('../utils/test-data');

// Extend base test with authenticated sessions
exports.test = base.extend({
  // Customer authenticated context
  authenticatedCustomerPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await loginPage.loginAsCustomer(CUSTOMER_DATA.phone, CUSTOMER_DATA.otp);
    await use(page);
  },

  // Merchant authenticated context
  authenticatedMerchantPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await loginPage.loginAsMerchant(MERCHANT_DATA.contactPhone, MERCHANT_DATA.otp);
    await use(page);
  },

  // Admin authenticated context
  authenticatedAdminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await loginPage.loginAsAdmin(ADMIN_DATA.phone, ADMIN_DATA.otp, ADMIN_DATA.email, ADMIN_DATA.password);
    await use(page);
  }
});

exports.expect = base.expect;
