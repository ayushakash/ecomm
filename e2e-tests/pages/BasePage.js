// Base Page Object with common functionality

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  async click(selector) {
    await this.page.click(selector);
  }

  async fill(selector, value) {
    await this.page.fill(selector, value);
  }

  async getText(selector) {
    return await this.page.textContent(selector);
  }

  async isVisible(selector) {
    return await this.page.isVisible(selector);
  }

  async waitForSelector(selector, options = {}) {
    await this.page.waitForSelector(selector, options);
  }

  async waitForText(text) {
    await this.page.waitForSelector(`text=${text}`);
  }

  async clickByText(text) {
    await this.page.click(`text=${text}`);
  }

  async getByRole(role, options = {}) {
    return this.page.getByRole(role, options);
  }

  async getByText(text) {
    return this.page.getByText(text);
  }

  async getByPlaceholder(placeholder) {
    return this.page.getByPlaceholder(placeholder);
  }

  async getByLabel(label) {
    return this.page.getByLabel(label);
  }

  async screenshot(options = {}) {
    return await this.page.screenshot(options);
  }
}

module.exports = { BasePage };
