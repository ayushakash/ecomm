const { BasePage } = require('./BasePage');

class ProductDetailPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.productTitle = 'h1, h2';
    this.productPrice = '[class*="price"]';
    this.productDescription = '[class*="description"]';
    this.quantityInput = 'input[type="number"]';
    this.incrementButton = 'button:has-text("+")';
    this.decrementButton = 'button:has-text("-")';
    this.addToCartButton = 'button:has-text("Add to Cart")';
    this.buyNowButton = 'button:has-text("Buy Now")';
    this.backButton = 'button:has-text("Back"), a:has-text("Back")';
    this.productImage = 'img[alt*="product"], img[class*="product"]';
    this.stockStatus = '[class*="stock"]';
  }

  async getProductTitle() {
    return await this.page.locator(this.productTitle).first().textContent();
  }

  async getProductPrice() {
    return await this.page.locator(this.productPrice).first().textContent();
  }

  async getProductDescription() {
    try {
      return await this.page.locator(this.productDescription).first().textContent();
    } catch {
      return null;
    }
  }

  async setQuantity(quantity) {
    await this.page.fill(this.quantityInput, quantity.toString());
  }

  async incrementQuantity(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.click(this.incrementButton);
      await this.page.waitForTimeout(300);
    }
  }

  async decrementQuantity(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.click(this.decrementButton);
      await this.page.waitForTimeout(300);
    }
  }

  async getQuantity() {
    return await this.page.inputValue(this.quantityInput);
  }

  async addToCart() {
    await this.click(this.addToCartButton);
    await this.page.waitForTimeout(1000); // Wait for cart update
  }

  async buyNow() {
    await this.click(this.buyNowButton);
    await this.waitForNavigation();
  }

  async goBack() {
    await this.click(this.backButton);
    await this.waitForNavigation();
  }

  async isOutOfStock() {
    const stockText = await this.page.textContent(this.stockStatus).catch(() => '');
    return stockText.toLowerCase().includes('out of stock');
  }

  async isAddToCartButtonEnabled() {
    return await this.page.isEnabled(this.addToCartButton);
  }
}

module.exports = { ProductDetailPage };
