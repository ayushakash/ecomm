const { BasePage } = require('./BasePage');

class ProductsPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.searchInput = 'input[type="search"], input[placeholder*="Search"]';
    this.searchButton = 'button:has-text("Search")';
    this.productCard = '[class*="ProductCard"], [class*="product-card"]';
    this.productTitle = '[class*="product-title"], h3, h2';
    this.productPrice = '[class*="price"]';
    this.addToCartButton = 'button:has-text("Add to Cart")';
    this.categoryFilter = 'select[name="category"]';
    this.sortBySelect = 'select[name="sort"]';
    this.priceRangeMin = 'input[name="minPrice"]';
    this.priceRangeMax = 'input[name="maxPrice"]';
    this.filterButton = 'button:has-text("Filter"), button:has-text("Apply")';
  }

  async navigateToProducts() {
    await this.goto('/products');
    await this.waitForNavigation();
  }

  async searchProduct(query) {
    await this.fill(this.searchInput, query);
    if (await this.isVisible(this.searchButton)) {
      await this.click(this.searchButton);
    } else {
      await this.page.press(this.searchInput, 'Enter');
    }
    await this.page.waitForTimeout(1000);
  }

  async getProductCards() {
    await this.page.waitForSelector(this.productCard, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.productCard).all();
  }

  async getProductCount() {
    const products = await this.getProductCards();
    return products.length;
  }

  async clickFirstProduct() {
    const firstProduct = this.page.locator(this.productCard).first();
    await firstProduct.click();
    await this.waitForNavigation();
  }

  async clickProductByName(name) {
    await this.page.click(`text=${name}`);
    await this.waitForNavigation();
  }

  async filterByCategory(category) {
    await this.page.selectOption(this.categoryFilter, category);
    await this.page.waitForTimeout(1000);
  }

  async filterByPriceRange(min, max) {
    if (await this.isVisible(this.priceRangeMin)) {
      await this.fill(this.priceRangeMin, min.toString());
      await this.fill(this.priceRangeMax, max.toString());
      await this.click(this.filterButton);
      await this.page.waitForTimeout(1000);
    }
  }

  async sortBy(option) {
    if (await this.isVisible(this.sortBySelect)) {
      await this.page.selectOption(this.sortBySelect, option);
      await this.page.waitForTimeout(1000);
    }
  }

  async addFirstProductToCart() {
    const firstProduct = this.page.locator(this.productCard).first();
    await firstProduct.locator(this.addToCartButton).click();
    await this.page.waitForTimeout(500);
  }

  async isNoProductsMessageVisible() {
    return await this.page.isVisible('text=No products found');
  }
}

module.exports = { ProductsPage };
