const { BasePage } = require('./BasePage');

class ProfilePage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.nameInput = 'input[name="name"]';
    this.emailInput = 'input[name="email"]';
    this.phoneInput = 'input[name="phone"]';
    this.updateProfileButton = 'button:has-text("Update Profile"), button:has-text("Save")';
    this.ordersLink = 'a:has-text("Orders"), a:has-text("My Orders")';
    this.addressesLink = 'a:has-text("Addresses"), a:has-text("My Addresses")';
    this.logoutButton = 'button:has-text("Logout")';
  }

  async navigateToProfile() {
    await this.goto('/profile');
    await this.waitForNavigation();
  }

  async updateProfile(name, email) {
    await this.fill(this.nameInput, name);
    if (email) {
      await this.fill(this.emailInput, email);
    }
    await this.click(this.updateProfileButton);
    await this.page.waitForTimeout(1000);
  }

  async goToOrders() {
    await this.click(this.ordersLink);
    await this.waitForNavigation();
  }

  async goToAddresses() {
    await this.click(this.addressesLink);
    await this.waitForNavigation();
  }

  async logout() {
    await this.click(this.logoutButton);
    await this.waitForNavigation();
  }
}

class OrdersPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.orderCard = '[class*="order-card"], [class*="OrderCard"]';
    this.orderNumber = '[class*="order-number"]';
    this.orderStatus = '[class*="status"]';
    this.viewDetailsButton = 'button:has-text("View Details"), a:has-text("View Details")';
    this.cancelOrderButton = 'button:has-text("Cancel Order")';
  }

  async navigateToOrders() {
    await this.goto('/profile/orders');
    await this.waitForNavigation();
  }

  async getOrders() {
    await this.page.waitForSelector(this.orderCard, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.orderCard).all();
  }

  async getOrderCount() {
    const orders = await this.getOrders();
    return orders.length;
  }

  async viewFirstOrder() {
    const firstOrder = this.page.locator(this.orderCard).first();
    await firstOrder.locator(this.viewDetailsButton).click();
    await this.waitForNavigation();
  }

  async getFirstOrderNumber() {
    try {
      return await this.page.locator(this.orderNumber).first().textContent();
    } catch {
      return null;
    }
  }
}

class AddressesPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.addressCard = '[class*="address-card"]';
    this.addAddressButton = 'button:has-text("Add Address"), button:has-text("Add New")';
    this.editAddressButton = 'button:has-text("Edit")';
    this.deleteAddressButton = 'button:has-text("Delete")';
    this.setDefaultButton = 'button:has-text("Set as Default")';
  }

  async navigateToAddresses() {
    await this.goto('/profile/addresses');
    await this.waitForNavigation();
  }

  async getAddresses() {
    await this.page.waitForSelector(this.addressCard, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.addressCard).all();
  }

  async getAddressCount() {
    const addresses = await this.getAddresses();
    return addresses.length;
  }

  async deleteFirstAddress() {
    const firstAddress = this.page.locator(this.addressCard).first();
    await firstAddress.locator(this.deleteAddressButton).click();

    // Confirm deletion if modal appears
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    await this.page.waitForTimeout(1000);
  }
}

module.exports = { ProfilePage, OrdersPage, AddressesPage };
