const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.phoneInput = '#mobile';
    this.otpInput = '#otp';
    this.emailInput = '#email';
    this.passwordInput = '#password';
    this.sendOTPButton = 'button:has-text("Send OTP")';
    this.verifyOTPButton = 'button:has-text("Verify")';
    this.loginButton = 'button:has-text("Complete Login")';
    this.registerLink = 'a:has-text("Sign up here")';
    this.merchantRegisterLink = 'a:has-text("Merchant Sign Up")';
  }

  async navigateToLogin() {
    await this.goto('/login');
    await this.waitForNavigation();
  }

  async enterPhoneNumber(phone) {
    await this.fill(this.phoneInput, phone);
  }

  async clickSendOTP() {
    await this.click(this.sendOTPButton);
    await this.page.waitForTimeout(1000); // Wait for OTP to be sent
  }

  async enterOTP(otp) {
    await this.fill(this.otpInput, otp);
  }

  async clickVerifyOTP() {
    await this.click(this.verifyOTPButton);
    await this.page.waitForTimeout(1000);
  }

  async enterEmail(email) {
    await this.fill(this.emailInput, email);
  }

  async enterPassword(password) {
    await this.fill(this.passwordInput, password);
  }

  async clickLogin() {
    await this.click(this.loginButton);
    await this.waitForNavigation();
  }

  async loginAsCustomer(phone, otp) {
    await this.navigateToLogin();
    await this.enterPhoneNumber(phone);
    await this.clickSendOTP();
    await this.enterOTP(otp);
    await this.clickVerifyOTP();
    await this.waitForNavigation();
  }

  async loginAsMerchant(phone, otp) {
    await this.navigateToLogin();
    await this.enterPhoneNumber(phone);
    await this.clickSendOTP();
    await this.enterOTP(otp);
    await this.clickVerifyOTP();
    await this.waitForNavigation();
  }

  async loginAsAdmin(phone, otp, email, password) {
    await this.navigateToLogin();
    await this.enterPhoneNumber(phone);
    await this.clickSendOTP();
    await this.enterOTP(otp);
    await this.clickVerifyOTP();
    await this.page.waitForTimeout(1000);
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickLogin();
    await this.waitForNavigation();
  }

  async clickRegister() {
    await this.click(this.registerLink);
    await this.waitForNavigation();
  }

  async clickMerchantRegister() {
    await this.click(this.merchantRegisterLink);
    await this.waitForNavigation();
  }

  async getErrorMessage() {
    try {
      return await this.page.textContent('[role="alert"]', { timeout: 3000 });
    } catch {
      return null;
    }
  }

  async logout() {
    // Look for logout button in navigation
    const logoutButton = this.page.locator('button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.waitForNavigation();
    }
  }
}

module.exports = { LoginPage };
