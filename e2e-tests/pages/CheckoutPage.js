const { BasePage } = require('./BasePage');

class CheckoutPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.addressSelector = 'input[type="radio"][name="address"]';
    this.addNewAddressButton = 'button:has-text("Add New Address"), button:has-text("Add Address")';
    this.deliveryInstructionsTextarea = 'textarea[name="deliveryInstructions"]';
    this.paymentMethodSelect = 'select[name="paymentMethod"]';
    this.gstBillCheckbox = 'input[type="checkbox"][name="requireGSTBill"]';
    this.placeOrderButton = 'button:has-text("Place Order")';
    this.orderSummary = '[class*="order-summary"]';
    this.totalAmount = '[class*="total"]';

    // Address form selectors
    this.addressModal = '[role="dialog"], [class*="modal"]';
    this.fullNameInput = 'input[name="fullName"]';
    this.phoneNumberInput = 'input[name="phoneNumber"]';
    this.addressLine1Input = 'input[name="addressLine1"]';
    this.addressLine2Input = 'input[name="addressLine2"]';
    this.landmarkInput = 'input[name="landmark"]';
    this.areaInput = 'input[name="area"]';
    this.cityInput = 'input[name="city"]';
    this.stateSelect = 'select[name="state"]';
    this.pincodeInput = 'input[name="pincode"]';
    this.addressTypeSelect = 'select[name="addressType"]';
    this.latitudeInput = 'input[name="latitude"]';
    this.longitudeInput = 'input[name="longitude"]';
    this.useCurrentLocationButton = 'button:has-text("Use Current Location")';
    this.saveAddressButton = 'button:has-text("Save Address"), button:has-text("Add Address")';
  }

  async navigateToCheckout() {
    await this.goto('/checkout');
    await this.waitForNavigation();
  }

  async selectAddress(index = 0) {
    const addresses = await this.page.locator(this.addressSelector).all();
    if (addresses[index]) {
      await addresses[index].check();
      await this.page.waitForTimeout(500);
    }
  }

  async selectFirstAddress() {
    await this.selectAddress(0);
  }

  async clickAddNewAddress() {
    await this.click(this.addNewAddressButton);
    await this.page.waitForSelector(this.addressModal, { timeout: 3000 });
  }

  async fillAddressForm(addressData) {
    await this.fill(this.fullNameInput, addressData.fullName);
    await this.fill(this.phoneNumberInput, addressData.phoneNumber);
    await this.fill(this.addressLine1Input, addressData.addressLine1);

    if (addressData.addressLine2) {
      await this.fill(this.addressLine2Input, addressData.addressLine2);
    }

    if (addressData.landmark) {
      await this.fill(this.landmarkInput, addressData.landmark);
    }

    await this.fill(this.areaInput, addressData.area);
    await this.fill(this.cityInput, addressData.city);
    await this.page.selectOption(this.stateSelect, addressData.state);
    await this.fill(this.pincodeInput, addressData.pincode);

    if (addressData.addressType) {
      await this.page.selectOption(this.addressTypeSelect, addressData.addressType);
    }

    // Set GPS coordinates
    await this.fill(this.latitudeInput, addressData.latitude);
    await this.fill(this.longitudeInput, addressData.longitude);
  }

  async saveAddress() {
    await this.click(this.saveAddressButton);
    await this.page.waitForTimeout(1000);
  }

  async addNewAddress(addressData) {
    await this.clickAddNewAddress();
    await this.fillAddressForm(addressData);
    await this.saveAddress();
  }

  async setDeliveryInstructions(instructions) {
    await this.fill(this.deliveryInstructionsTextarea, instructions);
  }

  async selectPaymentMethod(method) {
    await this.page.selectOption(this.paymentMethodSelect, method);
  }

  async checkGSTBillOption() {
    await this.page.check(this.gstBillCheckbox);
  }

  async placeOrder() {
    await this.click(this.placeOrderButton);
    await this.page.waitForTimeout(2000); // Wait for order processing
  }

  async getTotalAmount() {
    try {
      const totalText = await this.page.locator(this.totalAmount).last().textContent();
      return totalText.replace(/[^0-9.]/g, '');
    } catch {
      return '0';
    }
  }

  async completePurchase(addressData, paymentMethod = 'COD') {
    await this.navigateToCheckout();

    // Check if address exists, if not add new one
    const addressExists = await this.page.locator(this.addressSelector).count() > 0;

    if (!addressExists) {
      await this.addNewAddress(addressData);
    } else {
      await this.selectFirstAddress();
    }

    await this.selectPaymentMethod(paymentMethod);
    await this.setDeliveryInstructions(addressData.deliveryInstructions || 'Please call before delivery');
    await this.placeOrder();
    await this.waitForNavigation();
  }
}

module.exports = { CheckoutPage };
