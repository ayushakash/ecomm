const { BasePage } = require('./BasePage');

class MerchantPayoutsPage extends BasePage {
  constructor(page) {
    super(page);

    // Navigation
    this.payoutsLink = 'a:has-text("Payouts"), a[href*="payouts"]';

    // Payout cards/rows
    this.payoutCard = '[class*="payout-card"], [class*="order-card"]';
    this.orderRow = 'tr[class*="order"], div[class*="order"]';

    // Payout details
    this.netPayoutAmount = 'text=/Net.*Payout|You.*Receive|Merchant.*Gets/i';
    this.owePlatformAmount = 'text=/Owe.*Platform|Platform.*Fee|Remit/i';
    this.codCollectionAmount = 'text=/COD.*Collect|Collect.*Customer/i';

    // GST breakdown
    this.gstBreakdownSection = 'text=/GST.*Breakdown/i';
    this.merchantGST = 'text=/Merchant.*GST/i';
    this.platformGST = 'text=/Platform.*GST/i';

    // Platform charges
    this.platformChargesSection = 'text=/Platform.*Charges/i';
    this.platformCommission = 'text=/Commission/i';
    this.platformFee = 'text=/Platform.*Fee/i';
    this.deliveryShare = 'text=/Delivery.*Share/i';

    // Filters and actions
    this.statusFilter = 'select[name="status"], button[class*="filter"]';
    this.dateFilter = 'input[type="date"]';
    this.exportButton = 'button:has-text("Export"), button:has-text("Download")';

    // Settlement
    this.settlementStatus = 'text=/Settled|Pending|Processing/i';
    this.settleButton = 'button:has-text("Settle"), button:has-text("Mark Settled")';
  }

  async navigateToPayouts() {
    await this.goto('/merchant/payouts');
    await this.waitForNavigation();
  }

  async clickPayoutsLink() {
    await this.click(this.payoutsLink);
    await this.waitForNavigation();
  }

  async getAllPayouts() {
    await this.page.waitForSelector(this.payoutCard, { timeout: 5000 }).catch(() => {});
    return await this.page.locator(this.payoutCard).all();
  }

  async getPayoutByOrderNumber(orderNumber) {
    const payoutCard = this.page.locator(`text=${orderNumber}`).locator('..');
    await payoutCard.waitFor({ state: 'visible', timeout: 10000 });
    return payoutCard;
  }

  async getNetPayout(payoutCard) {
    const text = await payoutCard.locator(this.netPayoutAmount).locator('..').locator('text=/₹[\d,]+\.?\d*/').textContent();
    return this.parseAmount(text);
  }

  async getOwePlatform(payoutCard) {
    const text = await payoutCard.locator(this.owePlatformAmount).locator('..').locator('text=/₹[\d,]+\.?\d*/').textContent();
    return this.parseAmount(text);
  }

  async getCODCollection(payoutCard) {
    const text = await payoutCard.locator(this.codCollectionAmount).locator('..').locator('text=/₹[\d,]+\.?\d*/').textContent();
    return this.parseAmount(text);
  }

  async getMerchantGST(payoutCard) {
    const text = await payoutCard.locator(this.merchantGST).locator('..').locator('text=/₹[\d,]+\.?\d*/').textContent();
    return this.parseAmount(text);
  }

  async getPlatformGST(payoutCard) {
    const text = await payoutCard.locator(this.platformGST).locator('..').locator('text=/₹[\d,]+\.?\d*/').textContent();
    return this.parseAmount(text);
  }

  async getPlatformCommission(payoutCard) {
    const text = await payoutCard.locator(this.platformCommission).locator('..').locator('text=/₹[\d,]+\.?\d*/').textContent();
    return this.parseAmount(text);
  }

  async hasGSTBreakdown(payoutCard) {
    return await payoutCard.locator(this.gstBreakdownSection).isVisible({ timeout: 2000 }).catch(() => false);
  }

  async filterByStatus(status) {
    const filter = this.page.locator(this.statusFilter).first();
    if (await filter.isVisible({ timeout: 2000 })) {
      if (filter.getAttribute('tagName') === 'SELECT') {
        await this.page.selectOption(this.statusFilter, status);
      } else {
        await filter.click();
        await this.page.locator(`text=${status}`).click();
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async getTotalPayouts() {
    // Sum all net payouts on page
    const payouts = await this.getAllPayouts();
    let total = 0;

    for (const payout of payouts) {
      try {
        const amount = await this.getNetPayout(payout);
        total += amount;
      } catch (e) {
        // Skip if can't parse
      }
    }

    return total;
  }

  async getTotalRevenue() {
    // Sum all platform earnings (owe platform amounts)
    const payouts = await this.getAllPayouts();
    let total = 0;

    for (const payout of payouts) {
      try {
        const amount = await this.getOwePlatform(payout);
        total += amount;
      } catch (e) {
        // Skip if can't parse
      }
    }

    return total;
  }

  async getPayoutSummary(orderNumber) {
    const payoutCard = await this.getPayoutByOrderNumber(orderNumber);

    const summary = {
      orderNumber,
      netPayout: 0,
      owePlatform: 0,
      codCollection: 0,
      merchantGST: 0,
      platformGST: 0,
      platformCommission: 0,
      hasGSTBreakdown: false
    };

    try {
      summary.netPayout = await this.getNetPayout(payoutCard);
      summary.owePlatform = await this.getOwePlatform(payoutCard);
      summary.codCollection = await this.getCODCollection(payoutCard);
      summary.hasGSTBreakdown = await this.hasGSTBreakdown(payoutCard);

      if (summary.hasGSTBreakdown) {
        summary.merchantGST = await this.getMerchantGST(payoutCard);
        summary.platformGST = await this.getPlatformGST(payoutCard);
      }

      try {
        summary.platformCommission = await this.getPlatformCommission(payoutCard);
      } catch (e) {
        // Platform commission might not be separately displayed
      }
    } catch (error) {
      console.error('Error getting payout summary:', error.message);
    }

    return summary;
  }

  parseAmount(text) {
    if (!text) return 0;
    const match = text.match(/₹([\d,]+\.?\d*)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  }
}

module.exports = { MerchantPayoutsPage };
