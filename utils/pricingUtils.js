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
   * Calculate tax amount
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
   * Calculate complete order totals
   */
  calculateOrderTotals(items, customerData = {}) {
    let subtotal = 0;
    let totalWeight = 0;
    
    // Calculate subtotal and total weight
    for (const item of items) {
      subtotal += item.totalPrice;
      totalWeight += (item.weight || 0) * item.quantity;
    }
    
    // Note: Minimum order validation is handled on the frontend
    
    const tax = this.calculateTax(subtotal);
    const deliveryCharges = this.calculateDeliveryCharges(
      subtotal, 
      totalWeight, 
      customerData.distance || 0
    );
    const platformFee = this.calculatePlatformFee(subtotal);
    
    const totalAmount = subtotal + tax + deliveryCharges + platformFee;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      breakdown: {
        taxRate: this.settings.taxRate,
        deliveryConfig: this.settings.deliveryConfig,
        minimumOrderValue: this.settings.minimumOrderValue
      }
    };
  }

  /**
   * Get the display price for a product based on settings
   */
  async getDisplayPrice(product) {
    switch (this.settings.priceDisplayMode) {
      case 'admin':
        return product.price; // Admin-set price
        
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
        return merchantProduct ? merchantProduct.price : product.price;
        
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
        return Math.min(adminPrice, merchantPrice);
        
      default:
        return product.price;
    }
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