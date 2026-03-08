const { BasePage } = require('./BasePage');

class CartPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.cartItem = '[class*="cart-item"], [class*="CartItem"]';
    this.quantityInput = 'input[type="number"]';
    this.incrementButton = 'button:has-text("+")';
    this.decrementButton = 'button:has-text("-")';
    this.removeButton = 'button:has-text("Remove")';
    this.subtotalAmount = '[class*="subtotal"]';
    this.taxAmount = '[class*="tax"], [class*="gst"]';
    this.deliveryCharges = '[class*="delivery"]';
    this.totalAmount = '[class*="total"]';
    this.checkoutButton = 'button:has-text("Checkout"), button:has-text("Proceed")';
    this.continueShoppingButton = 'button:has-text("Continue Shopping"), a:has-text("Continue Shopping")';
    this.emptyCartMessage = 'text=Your cart is empty, text=No items in cart';
    this.loginPrompt = 'text=Please login, text=Login to checkout';
  }

  async navigateToCart() {
    await this.goto('/cart');
    await this.waitForNavigation();
  }

  async getCartItems() {
    await this.page.waitForSelector(this.cartItem, { timeout: 3000 }).catch(() => {});
    return await this.page.locator(this.cartItem).all();
  }

  async getCartItemCount() {
    const items = await this.getCartItems();
    return items.length;
  }

  async isCartEmpty() {
    return await this.page.isVisible(this.emptyCartMessage);
  }

  async updateQuantity(itemIndex, quantity) {
    const items = await this.getCartItems();
    if (items[itemIndex]) {
      const quantityInput = items[itemIndex].locator(this.quantityInput);
      await quantityInput.fill(quantity.toString());
      await this.page.waitForTimeout(500); // Wait for price update
    }
  }

  async incrementItemQuantity(itemIndex) {
    const items = await this.getCartItems();
    if (items[itemIndex]) {
      await items[itemIndex].locator(this.incrementButton).click();
      await this.page.waitForTimeout(500);
    }
  }

  async decrementItemQuantity(itemIndex) {
    const items = await this.getCartItems();
    if (items[itemIndex]) {
      await items[itemIndex].locator(this.decrementButton).click();
      await this.page.waitForTimeout(500);
    }
  }

  async removeItem(itemIndex) {
    const items = await this.getCartItems();
    if (items[itemIndex]) {
      await items[itemIndex].locator(this.removeButton).click();
      await this.page.waitForTimeout(500);
    }
  }

  async removeFirstItem() {
    await this.removeItem(0);
  }

  async getTotalAmount() {
    try {
      const totalText = await this.page.locator(this.totalAmount).last().textContent();
      return totalText.replace(/[^0-9.]/g, '');
    } catch {
      return '0';
    }
  }

  async proceedToCheckout() {
    await this.click(this.checkoutButton);
    await this.waitForNavigation();
  }

  async continueShopping() {
    await this.click(this.continueShoppingButton);
    await this.waitForNavigation();
  }

  async isLoginPromptVisible() {
    return await this.page.isVisible(this.loginPrompt);
  }

  async clearCart() {
    let itemCount = await this.getCartItemCount();
    while (itemCount > 0) {
      await this.removeFirstItem();
      await this.page.waitForTimeout(500);
      itemCount = await this.getCartItemCount();
    }
  }
}

module.exports = { CartPage };
