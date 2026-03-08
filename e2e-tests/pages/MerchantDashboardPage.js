const { BasePage } = require('./BasePage');

class MerchantDashboardPage extends BasePage {
  constructor(page) {
    super(page);

    // Navigation selectors
    this.dashboardLink = 'a:has-text("Dashboard")';
    this.productsLink = 'a:has-text("Products")';
    this.ordersLink = 'a:has-text("Orders")';
    this.profileLink = 'a:has-text("Profile")';
    this.analyticsLink = 'a:has-text("Analytics")';
    this.payoutsLink = 'a:has-text("Payouts")';

    // Dashboard metrics
    this.todayOrdersMetric = '[class*="metric"]:has-text("Orders")';
    this.todayRevenueMetric = '[class*="metric"]:has-text("Revenue")';
    this.pendingOrdersMetric = '[class*="metric"]:has-text("Pending")';
  }

  async navigateToDashboard() {
    await this.goto('/merchant');
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

  async goToProfile() {
    await this.click(this.profileLink);
    await this.waitForNavigation();
  }
}

class MerchantProductsPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.addProductButton = 'button:has-text("Add Product"), button:has-text("Add to Inventory")';
    this.productRow = 'tr[class*="product"], [class*="product-card"]';
    this.editButton = 'button:has-text("Edit")';
    this.deleteButton = 'button:has-text("Delete")';
    this.enableToggle = 'input[type="checkbox"]';

    // Product form
    this.productSelect = 'select[name="productId"]';
    this.priceInput = 'input[name="price"]';
    this.stockInput = 'input[name="stock"]';
    this.saveProductButton = 'button:has-text("Save"), button:has-text("Add")';
  }

  async navigateToProducts() {
    await this.goto('/merchant/products');
    await this.waitForNavigation();
  }

  async clickAddProduct() {
    await this.click(this.addProductButton);
    await this.page.waitForTimeout(500);
  }

  async addProductToInventory(productName, price, stock) {
    await this.clickAddProduct();

    // Select product from master catalog
    await this.page.selectOption(this.productSelect, { label: productName });
    await this.fill(this.priceInput, price.toString());
    await this.fill(this.stockInput, stock.toString());

    await this.click(this.saveProductButton);
    await this.page.waitForTimeout(1000);
  }

  async updateStock(index, newStock) {
    const products = await this.page.locator(this.productRow).all();
    if (products[index]) {
      await products[index].locator(this.editButton).click();
      await this.page.waitForTimeout(500);
      await this.fill(this.stockInput, newStock.toString());
      await this.click(this.saveProductButton);
      await this.page.waitForTimeout(1000);
    }
  }
}

class MerchantOrdersPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.orderRow = 'tr[class*="order"], [class*="order-card"]';
    this.viewDetailsButton = 'button:has-text("View Details")';
    this.claimOrderButton = 'button:has-text("Claim"), button:has-text("Accept")';
    this.updateStatusButton = 'button:has-text("Update Status")';
    this.statusSelect = 'select[name="status"]';
    this.statusFilter = 'select[name="filter"]';
  }

  async navigateToOrders() {
    await this.goto('/merchant/orders');
    await this.waitForNavigation();
  }

  async getOrders() {
    await this.page.waitForSelector(this.orderRow, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.orderRow).all();
  }

  async claimFirstOrder() {
    const firstOrder = this.page.locator(this.orderRow).first();
    const claimButton = firstOrder.locator(this.claimOrderButton);

    if (await claimButton.isVisible({ timeout: 2000 })) {
      await claimButton.click();

      // Confirm if modal appears
      const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      await this.page.waitForTimeout(1000);
    }
  }

  async updateOrderStatus(index, status) {
    const orders = await this.getOrders();
    if (orders[index]) {
      await orders[index].locator(this.viewDetailsButton).click();
      await this.page.waitForTimeout(500);
      await this.page.selectOption(this.statusSelect, status);
      await this.click(this.updateStatusButton);
      await this.page.waitForTimeout(1000);
    }
  }
}

module.exports = {
  MerchantDashboardPage,
  MerchantProductsPage,
  MerchantOrdersPage
};
