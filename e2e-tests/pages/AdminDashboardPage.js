const { BasePage } = require('./BasePage');

class AdminDashboardPage extends BasePage {
  constructor(page) {
    super(page);

    // Navigation selectors
    this.dashboardLink = 'a:has-text("Dashboard")';
    this.usersLink = 'a:has-text("Users")';
    this.merchantsLink = 'a:has-text("Merchants")';
    this.productsLink = 'a:has-text("Products")';
    this.ordersLink = 'a:has-text("Orders")';
    this.analyticsLink = 'a:has-text("Analytics")';
    this.settingsLink = 'a:has-text("Settings")';
    this.earningsLink = 'a:has-text("Earnings")';

    // Dashboard metrics
    this.todayOrdersMetric = '[class*="metric"]:has-text("Today\'s Orders")';
    this.todayRevenueMetric = '[class*="metric"]:has-text("Revenue")';
    this.newUsersMetric = '[class*="metric"]:has-text("New Users")';
  }

  async navigateToDashboard() {
    await this.goto('/admin');
    await this.waitForNavigation();
  }

  async goToUsers() {
    await this.click(this.usersLink);
    await this.waitForNavigation();
  }

  async goToMerchants() {
    await this.click(this.merchantsLink);
    await this.waitForNavigation();
  }

  async goToProducts() {
    await this.click(this.productsLink);
    await this.waitForNavigation();
  }

  async goToOrders() {
    await this.click(this.ordersLink);
    await this.waitForNavigation();
  }

  async goToSettings() {
    await this.click(this.settingsLink);
    await this.waitForNavigation();
  }
}

class AdminMerchantsPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.merchantRow = 'tr[class*="merchant"], [class*="merchant-card"]';
    this.approveButton = 'button:has-text("Approve")';
    this.rejectButton = 'button:has-text("Reject")';
    this.suspendButton = 'button:has-text("Suspend")';
    this.activateButton = 'button:has-text("Activate")';
    this.viewDetailsButton = 'button:has-text("View Details")';
    this.statusFilter = 'select[name="status"]';
  }

  async navigateToMerchants() {
    await this.goto('/admin/merchants');
    await this.waitForNavigation();
  }

  async getMerchants() {
    await this.page.waitForSelector(this.merchantRow, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.merchantRow).all();
  }

  async approveMerchant(index = 0) {
    const merchants = await this.getMerchants();
    if (merchants[index]) {
      await merchants[index].locator(this.approveButton).click();

      // Confirm if modal appears
      const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      await this.page.waitForTimeout(1000);
    }
  }

  async approveFirstPendingMerchant() {
    await this.approveMerchant(0);
  }

  async filterByStatus(status) {
    await this.page.selectOption(this.statusFilter, status);
    await this.page.waitForTimeout(1000);
  }
}

class AdminProductsPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.addProductButton = 'button:has-text("Add Product"), button:has-text("Create Product")';
    this.productRow = 'tr[class*="product"], [class*="product-card"]';
    this.editButton = 'button:has-text("Edit")';
    this.deleteButton = 'button:has-text("Delete")';
    this.enableToggle = 'input[type="checkbox"][name="enabled"]';

    // Product form
    this.nameInput = 'input[name="name"]';
    this.categorySelect = 'select[name="category"]';
    this.descriptionTextarea = 'textarea[name="description"]';
    this.priceInput = 'input[name="price"]';
    this.unitSelect = 'select[name="unit"]';
    this.gstRateInput = 'input[name="gstRate"]';
    this.saveProductButton = 'button:has-text("Save Product"), button:has-text("Create")';
  }

  async navigateToProducts() {
    await this.goto('/admin/products');
    await this.waitForNavigation();
  }

  async clickAddProduct() {
    await this.click(this.addProductButton);
    await this.page.waitForTimeout(500);
  }

  async fillProductForm(productData) {
    await this.fill(this.nameInput, productData.name);
    await this.page.selectOption(this.categorySelect, productData.category);
    await this.fill(this.descriptionTextarea, productData.description);
    await this.fill(this.priceInput, productData.price.toString());
    await this.page.selectOption(this.unitSelect, productData.unit);
    await this.fill(this.gstRateInput, productData.gstRate.toString());
  }

  async createProduct(productData) {
    await this.clickAddProduct();
    await this.fillProductForm(productData);
    await this.click(this.saveProductButton);
    await this.page.waitForTimeout(1000);
  }
}

class AdminOrdersPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.orderRow = 'tr[class*="order"], [class*="order-card"]';
    this.viewDetailsButton = 'button:has-text("View Details")';
    this.assignMerchantButton = 'button:has-text("Assign Merchant")';
    this.statusFilter = 'select[name="status"]';
  }

  async navigateToOrders() {
    await this.goto('/admin/orders');
    await this.waitForNavigation();
  }

  async getOrders() {
    await this.page.waitForSelector(this.orderRow, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.orderRow).all();
  }

  async viewFirstOrder() {
    const firstOrder = this.page.locator(this.orderRow).first();
    await firstOrder.locator(this.viewDetailsButton).click();
    await this.waitForNavigation();
  }
}

module.exports = {
  AdminDashboardPage,
  AdminMerchantsPage,
  AdminProductsPage,
  AdminOrdersPage
};
