const { BasePage } = require('./BasePage');

class AdminSettingsPage extends BasePage {
  constructor(page) {
    super(page);

    // Navigation
    this.settingsLink = 'a:has-text("Settings"), a[href*="settings"]';

    // GST Mode Settings
    this.gstModeSection = 'text=/GST.*Mode|GST.*Settings/i';
    this.gstModeNoGST = 'input[value="no-gst"], input[type="radio"][value="no-gst"]';
    this.gstModeInclusive = 'input[value="inclusive"], input[type="radio"][value="inclusive"]';
    this.gstModeExclusive = 'input[value="exclusive"], input[type="radio"][value="exclusive"]';

    // Tax Rate
    this.taxRateInput = 'input[name="taxRate"]';

    // Delivery Configuration
    this.deliveryTypeSelect = 'select[name="deliveryType"]';
    this.fixedChargeInput = 'input[name="fixedCharge"]';
    this.freeDeliveryThresholdInput = 'input[name="freeDeliveryThreshold"]';

    // Platform Fee
    this.platformFeeInput = 'input[name="platformFee"]';
    this.applyGSTOnPlatformFeeCheckbox = 'input[name="applyGSTOnPlatformFee"], input[type="checkbox"]';

    // Split GST
    this.splitGSTEnabledCheckbox = 'input[name="splitGSTEnabled"]';

    // Delivery Fee Split
    this.merchantDeliveryPercentInput = 'input[name="merchantPercent"]';
    this.platformDeliveryPercentInput = 'input[name="platformPercent"]';

    // Price Display Mode
    this.priceDisplayModeSelect = 'select[name="priceDisplayMode"]';

    // Stock Validation Mode
    this.stockValidationModeSelect = 'select[name="stockValidationMode"]';

    // Minimum Order Value
    this.minimumOrderValueInput = 'input[name="minimumOrderValue"]';

    // Save Button
    this.saveButton = 'button:has-text("Save"), button:has-text("Update")';
    this.cancelButton = 'button:has-text("Cancel"), button:has-text("Reset")';

    // Success/Error Messages
    this.successMessage = 'text=/success/i, [role="alert"]:has-text("success")';
    this.errorMessage = 'text=/error/i, [role="alert"]:has-text("error")';
  }

  async navigateToSettings() {
    await this.goto('/admin/settings');
    await this.waitForNavigation();
  }

  async clickSettingsLink() {
    await this.click(this.settingsLink);
    await this.waitForNavigation();
  }

  /**
   * Change GST Mode
   * @param {string} mode - 'no-gst', 'inclusive', or 'exclusive'
   */
  async changeGSTMode(mode) {
    console.log(`🔧 Changing GST mode to: ${mode}`);

    let selector;
    switch (mode.toLowerCase()) {
      case 'no-gst':
        selector = this.gstModeNoGST;
        break;
      case 'inclusive':
        selector = this.gstModeInclusive;
        break;
      case 'exclusive':
        selector = this.gstModeExclusive;
        break;
      default:
        throw new Error(`Invalid GST mode: ${mode}`);
    }

    // Wait for radio button to be available
    await this.page.waitForSelector(selector, { timeout: 5000 });

    // Click the radio button
    await this.page.click(selector);
    await this.page.waitForTimeout(500);

    console.log(`✅ Selected GST mode: ${mode}`);
  }

  async getCurrentGSTMode() {
    // Check which radio button is checked
    if (await this.page.isChecked(this.gstModeNoGST)) {
      return 'no-gst';
    } else if (await this.page.isChecked(this.gstModeInclusive)) {
      return 'inclusive';
    } else if (await this.page.isChecked(this.gstModeExclusive)) {
      return 'exclusive';
    }
    return null;
  }

  async setTaxRate(rate) {
    await this.fill(this.taxRateInput, rate.toString());
  }

  async setDeliveryType(type) {
    await this.page.selectOption(this.deliveryTypeSelect, type);
  }

  async setFixedCharge(amount) {
    await this.fill(this.fixedChargeInput, amount.toString());
  }

  async setFreeDeliveryThreshold(amount) {
    await this.fill(this.freeDeliveryThresholdInput, amount.toString());
  }

  async setPlatformFee(amount) {
    await this.fill(this.platformFeeInput, amount.toString());
  }

  async toggleApplyGSTOnPlatformFee(enabled) {
    const checkbox = this.page.locator(this.applyGSTOnPlatformFeeCheckbox);
    const isChecked = await checkbox.isChecked();

    if (enabled && !isChecked) {
      await checkbox.check();
    } else if (!enabled && isChecked) {
      await checkbox.uncheck();
    }
  }

  async toggleSplitGST(enabled) {
    const checkbox = this.page.locator(this.splitGSTEnabledCheckbox);
    const isChecked = await checkbox.isChecked();

    if (enabled && !isChecked) {
      await checkbox.check();
    } else if (!enabled && isChecked) {
      await checkbox.uncheck();
    }
  }

  async setDeliveryFeeSplit(merchantPercent, platformPercent) {
    // Ensure they sum to 100
    if (merchantPercent + platformPercent !== 100) {
      throw new Error('Delivery fee split must sum to 100%');
    }

    await this.fill(this.merchantDeliveryPercentInput, merchantPercent.toString());
    await this.fill(this.platformDeliveryPercentInput, platformPercent.toString());
  }

  async setPriceDisplayMode(mode) {
    await this.page.selectOption(this.priceDisplayModeSelect, mode);
  }

  async setStockValidationMode(mode) {
    await this.page.selectOption(this.stockValidationModeSelect, mode);
  }

  async setMinimumOrderValue(amount) {
    await this.fill(this.minimumOrderValueInput, amount.toString());
  }

  async saveSettings() {
    console.log('💾 Saving settings...');
    await this.click(this.saveButton);
    await this.page.waitForTimeout(2000);

    // Check for success message
    const success = await this.page.locator(this.successMessage).isVisible({ timeout: 5000 }).catch(() => false);

    if (success) {
      console.log('✅ Settings saved successfully');
      return true;
    } else {
      const error = await this.page.locator(this.errorMessage).textContent().catch(() => 'Unknown error');
      console.error('❌ Failed to save settings:', error);
      return false;
    }
  }

  async cancelChanges() {
    await this.click(this.cancelButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Complete flow to change GST mode and save
   */
  async changeGSTModeAndSave(mode) {
    await this.changeGSTMode(mode);
    await this.page.waitForTimeout(500);
    const saved = await this.saveSettings();

    if (!saved) {
      throw new Error(`Failed to save GST mode: ${mode}`);
    }

    // Verify the change was saved
    await this.page.reload();
    await this.page.waitForTimeout(1000);
    const currentMode = await this.getCurrentGSTMode();

    if (currentMode !== mode) {
      throw new Error(`GST mode not saved correctly. Expected: ${mode}, Got: ${currentMode}`);
    }

    console.log(`✅ GST mode changed and verified: ${mode}`);
    return true;
  }

  /**
   * Get current settings snapshot
   */
  async getSettings() {
    const settings = {
      gstMode: await this.getCurrentGSTMode(),
      taxRate: await this.page.inputValue(this.taxRateInput).catch(() => null),
      platformFee: await this.page.inputValue(this.platformFeeInput).catch(() => null),
      minimumOrderValue: await this.page.inputValue(this.minimumOrderValueInput).catch(() => null)
    };

    return settings;
  }
}

module.exports = { AdminSettingsPage };
