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
   * Calculate split GST between merchant and platform portions
   * @param {number} customerPrice - Final price customer pays per unit
   * @param {number} merchantBasePrice - Merchant's base cost per unit
   * @param {number} gstRate - GST rate percentage (e.g., 18)
   * @param {string} gstMode - 'no-gst' | 'inclusive' | 'exclusive'
   * @returns {object} { merchantGST, platformGST, totalGST, isDummyGST, merchantBase, platformBase, finalPrice }
   */
  calculateSplitGST(customerPrice, merchantBasePrice, gstRate, gstMode) {
    const rate = gstRate / 100;
    const platformCommission = customerPrice - merchantBasePrice;

    if (gstMode === 'no-gst') {
      // Show dummy GST for professional invoice appearance
      // Use 5% as dummy rate for display purposes
      const dummyRate = 0.05;
      const dummyBase = customerPrice / (1 + dummyRate);
      const dummyGST = customerPrice - dummyBase;

      return {
        merchantGST: 0,
        platformGST: 0,
        totalGST: 0,
        dummyGST: Math.round(dummyGST * 100) / 100,
        isDummyGST: true,
        merchantBase: merchantBasePrice,
        platformBase: platformCommission,
        finalPrice: customerPrice
      };
    }

    if (gstMode === 'inclusive') {
      // Extract GST from prices (GST already included in prices)
      const merchantBase = merchantBasePrice / (1 + rate);
      const merchantGST = merchantBasePrice - merchantBase;
      const platformBase = platformCommission / (1 + rate);
      const platformGST = platformCommission - platformBase;
      const totalGST = merchantGST + platformGST;

      return {
        merchantGST: Math.round(merchantGST * 100) / 100,
        platformGST: Math.round(platformGST * 100) / 100,
        totalGST: Math.round(totalGST * 100) / 100,
        dummyGST: 0,
        isDummyGST: false,
        merchantBase: Math.round(merchantBase * 100) / 100,
        platformBase: Math.round(platformBase * 100) / 100,
        finalPrice: customerPrice
      };
    }

    // gstMode === 'exclusive'
    // Add GST on top of base prices
    const merchantGST = merchantBasePrice * rate;
    const platformGST = platformCommission * rate;
    const totalGST = merchantGST + platformGST;
    const finalPrice = customerPrice + totalGST;

    return {
      merchantGST: Math.round(merchantGST * 100) / 100,
      platformGST: Math.round(platformGST * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      dummyGST: 0,
      isDummyGST: false,
      merchantBase: merchantBasePrice,
      platformBase: platformCommission,
      finalPrice: Math.round(finalPrice * 100) / 100
    };
  }

  /**
   * Calculate complete order totals with split GST handling
   */
  calculateOrderTotals(items, customerData = {}) {
    const gstMode = this.settings.gstMode || 'no-gst';
    const splitGSTEnabled = this.settings.splitGSTEnabled !== false;
    const deliveryFeeSplit = this.settings.deliveryFeeSplit || { merchantPercent: 100, platformPercent: 0 };
    const applyGSTOnPlatformFee = this.settings.applyGSTOnPlatformFee !== false;

    let subtotal = 0;
    let totalWeight = 0;
    let totalMerchantGST = 0;
    let totalPlatformGST = 0;
    let totalDummyGST = 0;
    let merchantSubtotal = 0;
    let platformCommissionSubtotal = 0;

    // Calculate per-item with split GST
    for (const item of items) {
      const customerPrice = item.price || 0; // What customer pays per unit
      const merchantPrice = item.merchantPrice || (customerPrice * 0.8); // Merchant base cost
      const gstRate = item.gstRate !== undefined ? item.gstRate : 18;
      const quantity = item.quantity || 0;

      if (splitGSTEnabled) {
        // Use split GST calculation
        const splitGST = this.calculateSplitGST(
          customerPrice,
          merchantPrice,
          gstRate,
          gstMode
        );

        // Subtotal = what customer pays (includes GST in inclusive mode, excludes in exclusive mode)
        // splitGST contains the extracted base amounts and GST breakdown
        subtotal += customerPrice * quantity;
        merchantSubtotal += splitGST.merchantBase * quantity;
        platformCommissionSubtotal += splitGST.platformBase * quantity;
        totalMerchantGST += splitGST.merchantGST * quantity;
        totalPlatformGST += splitGST.platformGST * quantity;
        totalDummyGST += splitGST.dummyGST * quantity;
      } else {
        // Legacy: single GST calculation (for backward compatibility if needed)
        subtotal += customerPrice * quantity;
        merchantSubtotal += merchantPrice * quantity;
        platformCommissionSubtotal += (customerPrice - merchantPrice) * quantity;
      }

      totalWeight += (item.weight || 0) * quantity;
    }

    // Calculate delivery charges
    const deliveryCharges = this.calculateDeliveryCharges(
      subtotal,
      totalWeight,
      customerData.distance || 0
    );

    // Split delivery charges between merchant and platform
    const merchantDeliveryShare = Math.round(deliveryCharges * (deliveryFeeSplit.merchantPercent / 100) * 100) / 100;
    const platformDeliveryShare = Math.round(deliveryCharges * (deliveryFeeSplit.platformPercent / 100) * 100) / 100;

    // Calculate platform fee
    const platformFeeBase = this.calculatePlatformFee(subtotal);
    let platformFeeGST = 0;
    if (applyGSTOnPlatformFee && gstMode === 'exclusive') {
      // Apply 18% GST on platform fee in exclusive mode
      platformFeeGST = Math.round(platformFeeBase * 0.18 * 100) / 100;
    }
    const platformFeeTotal = platformFeeBase + platformFeeGST;

    // Calculate total GST
    const totalGST = totalMerchantGST + totalPlatformGST;
    const isDummyGST = gstMode === 'no-gst';

    // Calculate total amount customer pays
    // In no-gst mode: subtotal (base prices) + delivery + platform fee (GST is dummy/for display only)
    // In inclusive mode: subtotal (GST-inclusive prices) + delivery + platform fee (GST already in subtotal)
    // In exclusive mode: subtotal (base prices) + GST + delivery + platform fee
    let totalAmount;
    if (gstMode === 'exclusive') {
      // In exclusive mode, add GST on top of base prices
      totalAmount = subtotal + totalGST + deliveryCharges + platformFeeTotal;
    } else if (gstMode === 'inclusive') {
      // In inclusive mode, subtotal already includes GST (don't add again)
      totalAmount = subtotal + deliveryCharges + platformFeeTotal;
    } else {
      // no-gst mode: no GST charged
      totalAmount = subtotal + deliveryCharges + platformFeeTotal;
    }

    console.log("🔍 Split GST Calculation:", {
      gstMode,
      subtotal: Math.round(subtotal * 100) / 100,
      merchantGST: Math.round(totalMerchantGST * 100) / 100,
      platformGST: Math.round(totalPlatformGST * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      isDummyGST,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      platformFee: Math.round(platformFeeTotal * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      subtotalBeforeGST: Math.round((merchantSubtotal + platformCommissionSubtotal) * 100) / 100,
      tax: Math.round(totalGST * 100) / 100,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      platformFee: Math.round(platformFeeTotal * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      // Enhanced GST breakdown
      gstBreakdown: {
        mode: gstMode,
        merchantGST: Math.round(totalMerchantGST * 100) / 100,
        platformGST: Math.round(totalPlatformGST * 100) / 100,
        totalGST: Math.round(totalGST * 100) / 100,
        isDummyGST,
        dummyGST: Math.round(totalDummyGST * 100) / 100,
        platformFeeGST: Math.round(platformFeeGST * 100) / 100
      },
      // Delivery fee split
      deliverySplit: {
        merchantShare: merchantDeliveryShare,
        platformShare: platformDeliveryShare
      },
      // Platform fee breakdown
      platformFeeBreakdown: {
        base: Math.round(platformFeeBase * 100) / 100,
        gst: Math.round(platformFeeGST * 100) / 100,
        total: Math.round(platformFeeTotal * 100) / 100
      },
      breakdown: {
        taxRate: this.settings.taxRate,
        deliveryConfig: this.settings.deliveryConfig,
        minimumOrderValue: this.settings.minimumOrderValue,
        gstMode,
        splitGSTEnabled,
        deliveryFeeSplit
      }
    };
  }

  /**
   * Get the display price for a product based on settings
   * This calculates the price based on:
   * 1. City-specific pricing (if cityId provided and price exists)
   * 2. priceDisplayMode (admin/merchant/lowest)
   * 3. gstMode (no-gst/inclusive/exclusive)
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

    // Step 3: Calculate display price based on gstMode and product's GST settings
    return this.calculateDisplayPriceWithGST(
      basePrice,
      product.gstRate || 18,
      product.gstType || 'exclusive'
    );
  }

  /**
   * Calculate display price based on GST mode
   * @param {number} price - The base product price
   * @param {number} gstRate - Product's GST rate
   * @param {string} gstType - Product's GST type (inclusive/exclusive/no-gst)
   * @returns {number} - Price to display to customer
   */
  calculateDisplayPriceWithGST(price, gstRate, gstType) {
    const displayMode = this.settings.gstMode || 'exclusive';

    // If product has no GST, always return the price as-is
    if (gstType === 'no-gst') {
      return price;
    }

    // If GST mode is "no-gst", show base price without any GST calculation
    if (displayMode === 'no-gst') {
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
        
      // Sum all merchant stocks — include both root stock (non-variant) and variantPricing stock
      const result = await MerchantProduct.aggregate([
        { $match: { productId: objectId, enabled: true } },
        {
          $project: {
            baseStock: '$stock',
            variantStock: { $sum: '$variantPricing.stock' }
          }
        },
        {
          $group: {
            _id: null,
            totalStock: { $sum: { $add: ['$baseStock', '$variantStock'] } }
          }
        }
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