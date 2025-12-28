const AppSettings = require('../models/AppSettings');
const MerchantProduct = require('../models/MerchantProduct');
const mongoose = require('mongoose');

/**
 * Calculate order totals with consistent pricing logic
 */
class PricingCalculator {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * Calculate delivery charges based on configuration
   */
  calculateDeliveryCharges(subtotal, totalWeight = 0, distance = 0) {
    const config = this.settings.deliveryConfig;
    
    switch (config.type) {
      case 'fixed':
        return config.fixedCharge;
        
      case 'threshold':
        return subtotal >= config.freeDeliveryThreshold ? 0 : config.chargeForBelowThreshold;
        
      case 'distance':
        if (distance <= config.baseDistance) return 0;
        return (distance - config.baseDistance) * config.perKmRate;
        
      case 'weight':
        if (totalWeight <= config.freeWeightLimit) return 0;
        return (totalWeight - config.freeWeightLimit) * config.perKgRate;
        
      default:
        return config.chargeForBelowThreshold;
    }
  }

  /**
   * Calculate GST amount and breakdown for a product
   * @param {number} price - The product price
   * @param {number} gstRate - GST rate percentage (0, 5, 12, 18, 28)
   * @param {string} gstType - 'inclusive', 'exclusive', or 'no-gst'
   * @returns {object} - { basePrice, gstAmount, finalPrice }
   */
  calculateProductGST(price, gstRate = 18, gstType = 'exclusive') {
    const rate = gstRate / 100;

    if (gstType === 'no-gst') {
      return {
        basePrice: price,
        gstAmount: 0,
        finalPrice: price
      };
    }

    if (gstType === 'inclusive') {
      // Price includes GST, extract base price and GST
      const basePrice = price / (1 + rate);
      const gstAmount = price - basePrice;
      return {
        basePrice: Math.round(basePrice * 100) / 100,
        gstAmount: Math.round(gstAmount * 100) / 100,
        finalPrice: price
      };
    }

    // gstType === 'exclusive'
    // GST is added on top of the base price
    const gstAmount = price * rate;
    const finalPrice = price + gstAmount;
    return {
      basePrice: price,
      gstAmount: Math.round(gstAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100
    };
  }

  /**
   * Calculate tax amount (legacy method for backward compatibility)
   */
  calculateTax(subtotal) {
    return Math.round(subtotal * this.settings.taxRate * 100) / 100;
  }

  /**
   * Calculate platform fee (if applicable)
   */
  calculatePlatformFee(subtotal) {
    return Math.round(subtotal * this.settings.platformFeeRate * 100) / 100;
  }

  /**
   * Calculate complete order totals with GST handling
   */
  calculateOrderTotals(items, customerData = {}) {
    let subtotal = 0;
    let totalWeight = 0;
    let totalGST = 0;
    let subtotalBeforeGST = 0;

    const displayMode = this.settings.gstDisplayMode || 'exclusive';

    // Calculate subtotal and total weight with GST handling
    for (const item of items) {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      const gstRate = item.gstRate !== undefined ? item.gstRate : 18;
      const gstType = item.gstType || 'exclusive';

      // If display mode is "no-display", treat all prices as final (GST already included)
      if (displayMode === 'no-display') {
        // Price is what customer pays - no additional GST
        subtotal += price * quantity;

        // Extract base price and GST for breakdown (if needed for invoice)
        console.log("GST TYPE",gstType);
        if (gstType !== 'no-gst') {
          const rate = gstRate / 100;
          const basePrice = price / (1 + rate);
          const gstAmount = price - basePrice;

          subtotalBeforeGST += basePrice * quantity;
          totalGST += gstAmount * quantity;
        } else {
          subtotalBeforeGST += price * quantity;
        }
      } else {
        // Normal GST calculation for inclusive/exclusive modes
        const gstCalc = this.calculateProductGST(price, gstRate, gstType);

        // For subtotal, use the final price (what customer pays per unit)
        subtotal += gstCalc.finalPrice * quantity;

        // Track base price (without GST) and GST separately
        subtotalBeforeGST += gstCalc.basePrice * quantity;
        totalGST += gstCalc.gstAmount * quantity;
      }

      totalWeight += (item.weight || 0) * quantity;
    }

    // Note: Minimum order validation is handled on the frontend

    
    // For backward compatibility, if items don't have GST info, use old tax calculation
    console.log("TOTAL GST",totalGST);
    const tax = totalGST > 0 ? totalGST : this.calculateTax(subtotal);
    console.log("TAXXX",tax);

    const deliveryCharges = this.calculateDeliveryCharges(
      subtotal,
      totalWeight,
      customerData.distance || 0
    );
    const platformFee = this.calculatePlatformFee(subtotal);

    const totalAmount = subtotal + deliveryCharges + platformFee;
    console.log("final Pricing",{
      subtotal: Math.round(subtotal * 100) / 100,
      subtotalBeforeGST: Math.round(subtotalBeforeGST * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      breakdown: {
        taxRate: this.settings.taxRate,
        deliveryConfig: this.settings.deliveryConfig,
        minimumOrderValue: this.settings.minimumOrderValue,
        gstIncluded: totalGST > 0,
        gstDisplayMode: displayMode
      }
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      subtotalBeforeGST: Math.round(subtotalBeforeGST * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      breakdown: {
        taxRate: this.settings.taxRate,
        deliveryConfig: this.settings.deliveryConfig,
        minimumOrderValue: this.settings.minimumOrderValue,
        gstIncluded: totalGST > 0,
        gstDisplayMode: displayMode
      }
    };
  }

  /**
   * Get the display price for a product based on settings
   * This calculates the price based on:
   * 1. City-specific pricing (if cityId provided and price exists)
   * 2. priceDisplayMode (admin/merchant/lowest)
   * 3. gstDisplayMode (inclusive/exclusive)
   * 4. product's individual gstRate and gstType
   *
   * @param {Object} product - Product document
   * @param {String} cityId - Optional city ID for city-specific pricing
   */
  async getDisplayPrice(product, cityId = null) {
    let basePrice;

    // Step 1: Check for city-specific pricing (highest priority)
    if (cityId && product.cityPricing && product.cityPricing.length > 0) {
      const cityPrice = product.cityPricing.find(
        cp => cp.cityId.toString() === cityId.toString() && cp.isAvailable
      );

      if (cityPrice) {
        basePrice = cityPrice.price;
        // Skip to GST calculation - city price overrides everything
        return this.calculateDisplayPriceWithGST(
          basePrice,
          product.gstRate || 18,
          product.gstType || 'exclusive'
        );
      }
    }

    // Step 2: Get the base price based on priceDisplayMode
    switch (this.settings.priceDisplayMode) {
      case 'admin':
        basePrice = product.price; // Admin-set price
        break;

      case 'merchant':
        // Find the merchant price (could be multiple merchants)
        const productId = mongoose.Types.ObjectId.isValid(product._id)
          ? new mongoose.Types.ObjectId(product._id)
          : product._id;

        const merchantProduct = await MerchantProduct.findOne({
          productId: productId,
          enabled: true,
          stock: { $gt: 0 }
        }).sort({ price: 1 }); // Get lowest price
        basePrice = merchantProduct ? merchantProduct.price : product.price;
        break;

      case 'lowest':
        // Find the lowest merchant price
        const productIdForLowest = mongoose.Types.ObjectId.isValid(product._id)
          ? new mongoose.Types.ObjectId(product._id)
          : product._id;

        const lowestPrice = await MerchantProduct.findOne({
          productId: productIdForLowest,
          enabled: true,
          stock: { $gt: 0 }
        }).sort({ price: 1 });
        const adminPrice = product.price;
        const merchantPrice = lowestPrice ? lowestPrice.price : adminPrice;
        basePrice = Math.min(adminPrice, merchantPrice);
        break;

      default:
        basePrice = product.price;
    }

    // Step 3: Calculate display price based on gstDisplayMode and product's GST settings
    return this.calculateDisplayPriceWithGST(
      basePrice,
      product.gstRate || 18,
      product.gstType || 'exclusive'
    );
  }

  /**
   * Calculate display price based on GST display mode
   * @param {number} price - The base product price
   * @param {number} gstRate - Product's GST rate
   * @param {string} gstType - Product's GST type (inclusive/exclusive/no-gst)
   * @returns {number} - Price to display to customer
   */
  calculateDisplayPriceWithGST(price, gstRate, gstType) {
    const displayMode = this.settings.gstDisplayMode || 'exclusive';

    // If product has no GST, always return the price as-is
    if (gstType === 'no-gst') {
      return price;
    }

    // If display mode is "no-display", show base price without any GST calculation
    if (displayMode === 'no-display') {
      // If price is inclusive, extract base price
      if (gstType === 'inclusive') {
        const rate = gstRate / 100;
        const basePrice = price / (1 + rate);
        return Math.round(basePrice * 100) / 100;
      }
      // If price is exclusive, return as-is
      return price;
    }

    const rate = gstRate / 100;

    // If displaying exclusive prices, show without GST
    if (displayMode === 'exclusive') {
      // If price is inclusive, extract base price
      if (gstType === 'inclusive') {
        const basePrice = price / (1 + rate);
        return Math.round(basePrice * 100) / 100;
      }
      // If price is exclusive, return as-is
      return price;
    }

    // If displaying inclusive prices, show with GST
    if (displayMode === 'inclusive') {
      // If price is exclusive, add GST
      if (gstType === 'exclusive') {
        const finalPrice = price * (1 + rate);
        return Math.round(finalPrice * 100) / 100;
      }
      // If price is inclusive, return as-is
      return price;
    }

    return price;
  }

  /**
   * Get total available stock for a product
   */
  async getTotalStock(productId) {
    if (this.settings.stockValidationMode === 'admin') {
      // Ensure productId is converted to ObjectId for aggregation
      const objectId = mongoose.Types.ObjectId.isValid(productId) 
        ? new mongoose.Types.ObjectId(productId)
        : productId;
        
      // Sum all merchant stocks
      const result = await MerchantProduct.aggregate([
        { $match: { productId: objectId, enabled: true } },
        { $group: { _id: null, totalStock: { $sum: '$stock' } } }
      ]);
      return result.length > 0 ? result[0].totalStock : 0;
    } else {
      // Use individual merchant stock (existing logic)
      return 0; // This would be handled per merchant
    }
  }
}

/**
 * Get pricing calculator with current settings
 */
async function getPricingCalculator() {
  const settings = await AppSettings.getSettings();
  return new PricingCalculator(settings);
}

/**
 * Middleware to add pricing calculator to request
 */
async function addPricingCalculator(req, res, next) {
  try {
    req.pricingCalculator = await getPricingCalculator();
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  PricingCalculator,
  getPricingCalculator,
  addPricingCalculator
};