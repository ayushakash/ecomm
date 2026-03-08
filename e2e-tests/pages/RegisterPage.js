const { BasePage } = require('./BasePage');

class RegisterPage extends BasePage {
  constructor(page) {
    super(page);

    // Customer registration selectors
    this.nameInput = '#name';
    this.phoneInput = '#mobile';
    this.otpInput = '#otp';
    this.sendOTPButton = 'button:has-text("Send OTP")';
    this.verifyButton = 'button:has-text("Verify")';
    this.loginLink = 'a:has-text("Login")';
  }

  async navigateToRegister() {
    await this.goto('/register');
    await this.waitForNavigation();
  }

  async registerCustomer(name, phone, otp) {
    await this.navigateToRegister();
    await this.fill(this.nameInput, name);
    await this.fill(this.phoneInput, phone);
    await this.click(this.sendOTPButton);
    await this.page.waitForTimeout(1000);
    await this.fill(this.otpInput, otp);
    await this.click(this.verifyButton);
    await this.waitForNavigation();
  }

  async getSuccessMessage() {
    try {
      return await this.page.textContent('text=successfully', { timeout: 3000 });
    } catch {
      return null;
    }
  }

  async clickLoginLink() {
    await this.click(this.loginLink);
    await this.waitForNavigation();
  }
}

class MerchantRegisterPage extends BasePage {
  constructor(page) {
    super(page);

    // Merchant registration selectors
    this.contactNameInput = 'input[name="contactName"]';
    this.contactPhoneInput = 'input[name="contactPhone"]';
    this.contactEmailInput = 'input[name="contactEmail"]';
    this.businessNameInput = 'input[name="businessName"]';
    this.businessTypeInput = 'input[name="businessType"]';
    this.addressInput = 'input[name="address"]';
    this.areaInput = 'input[name="area"]';
    this.cityInput = 'input[name="city"]';
    this.stateSelect = 'select[name="state"]';
    this.pincodeInput = 'input[name="pincode"]';
    this.latitudeInput = 'input[name="latitude"]';
    this.longitudeInput = 'input[name="longitude"]';
    this.gstInput = 'input[name="gstNumber"]';
    this.panInput = 'input[name="panNumber"]';
    this.otpInput = 'input[placeholder="Enter OTP"]';
    this.sendOTPButton = 'button:has-text("Send OTP")';
    this.registerButton = 'button:has-text("Register")';
  }

  async navigateToMerchantRegister() {
    await this.goto('/merchant-register');
    await this.waitForNavigation();
  }

  async fillBusinessDetails(data) {
    await this.fill(this.contactNameInput, data.contactName);
    await this.fill(this.contactPhoneInput, data.contactPhone);
    await this.fill(this.contactEmailInput, data.contactEmail);
    await this.fill(this.businessNameInput, data.businessName);
    await this.fill(this.businessTypeInput, data.businessType);
    await this.fill(this.addressInput, data.address);
    await this.fill(this.areaInput, data.area);
    await this.fill(this.cityInput, data.city);
    await this.page.selectOption(this.stateSelect, data.state);
    await this.fill(this.pincodeInput, data.pincode);
    await this.fill(this.latitudeInput, data.latitude);
    await this.fill(this.longitudeInput, data.longitude);
    await this.fill(this.gstInput, data.gstNumber);
    await this.fill(this.panInput, data.panNumber);
  }

  async sendOTP() {
    await this.click(this.sendOTPButton);
    await this.page.waitForTimeout(1000);
  }

  async enterOTP(otp) {
    await this.fill(this.otpInput, otp);
  }

  async submitRegistration() {
    await this.click(this.registerButton);
    await this.waitForNavigation();
  }

  async registerMerchant(data) {
    await this.navigateToMerchantRegister();
    await this.fillBusinessDetails(data);
    await this.sendOTP();
    await this.enterOTP(data.otp);
    await this.submitRegistration();
  }
}

module.exports = { RegisterPage, MerchantRegisterPage };
