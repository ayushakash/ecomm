const express = require('express');
const { body, validationResult } = require('express-validator');
const AppSettings = require('../models/AppSettings');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { getPricingCalculator } = require('../utils/pricingUtils');

const router = express.Router();

/**
 * GET /api/settings
 * Get current app settings
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await AppSettings.getSettings();
    
    // For non-admin users, only return limited settings
    if (req.user.role !== 'admin') {
      return res.json({
        taxRate: settings.taxRate,
        deliveryConfig: settings.deliveryConfig,
        minimumOrderValue: settings.minimumOrderValue,
        priceDisplayMode: settings.priceDisplayMode,
        gstMode: settings.gstMode,
        applyGSTOnPlatformFee: settings.applyGSTOnPlatformFee
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/settings
 * Update app settings (Admin only)
 */
router.put('/', [
  verifyToken,
  requireAdmin,
  body('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
  body('deliveryConfig.type').optional().isIn(['fixed', 'threshold', 'distance', 'weight']).withMessage('Invalid delivery type'),
  body('deliveryConfig.fixedCharge').optional().isFloat({ min: 0 }).withMessage('Fixed charge must be positive'),
  body('deliveryConfig.freeDeliveryThreshold').optional().isFloat({ min: 0 }).withMessage('Free delivery threshold must be positive'),
  body('deliveryConfig.chargeForBelowThreshold').optional().isFloat({ min: 0 }).withMessage('Below threshold charge must be positive'),
  body('priceDisplayMode').optional().isIn(['admin', 'merchant', 'lowest']).withMessage('Invalid price display mode'),
  body('gstDisplayMode').optional().isIn(['inclusive', 'exclusive', 'no-display']).withMessage('Invalid GST display mode'),
  body('stockValidationMode').optional().isIn(['admin', 'merchant']).withMessage('Invalid stock validation mode'),
  body('minimumOrderValue').optional().isFloat({ min: 0 }).withMessage('Minimum order value must be positive'),
  // New GST split settings
  body('gstMode').optional().isIn(['no-gst', 'inclusive', 'exclusive']).withMessage('Invalid GST mode'),
  body('splitGSTEnabled').optional().isBoolean().withMessage('splitGSTEnabled must be boolean'),
  body('deliveryFeeSplit.merchantPercent').optional().isInt({ min: 0, max: 100 }).withMessage('Merchant delivery percent must be 0-100'),
  body('deliveryFeeSplit.platformPercent').optional().isInt({ min: 0, max: 100 }).withMessage('Platform delivery percent must be 0-100'),
  body('applyGSTOnPlatformFee').optional().isBoolean().withMessage('applyGSTOnPlatformFee must be boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Additional validation: delivery split percentages must sum to 100
    if (req.body.deliveryFeeSplit) {
      const merchantPercent = req.body.deliveryFeeSplit.merchantPercent || 0;
      const platformPercent = req.body.deliveryFeeSplit.platformPercent || 0;
      if (merchantPercent + platformPercent !== 100) {
        return res.status(400).json({
          message: 'Delivery fee split percentages must sum to 100%',
          errors: [{ msg: 'merchantPercent + platformPercent must equal 100' }]
        });
      }
    }

    const settings = await AppSettings.updateSettings(req.body, req.user._id);
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/settings/calculate-pricing
 * Calculate pricing for given items (for preview)
 */
router.post('/calculate-pricing', [
  verifyToken,
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('items.*.gstRate').optional().isInt({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100'),
  body('items.*.gstType').optional().isIn(['inclusive', 'exclusive', 'no-gst']).withMessage('Invalid GST type'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, customerData } = req.body;
    const pricingCalculator = await getPricingCalculator();

    const totals = pricingCalculator.calculateOrderTotals(items, customerData);
    console.log("PRICING DESC",totals);
    res.json(totals);
  } catch (error) {
    console.error('Calculate pricing error:', error);
    res.status(400).json({ message: error.message || 'Calculation error' });
  }
});

/**
 * GET /api/settings/delivery-preview
 * Preview delivery charges for different order values
 */
router.get('/delivery-preview', verifyToken, async (req, res) => {
  try {
    const pricingCalculator = await getPricingCalculator();
    const orderValues = [100, 250, 500, 750, 1000, 1500, 2000];
    
    const preview = orderValues.map(value => ({
      orderValue: value,
      deliveryCharges: pricingCalculator.calculateDeliveryCharges(value),
      tax: pricingCalculator.calculateTax(value),
      total: value + pricingCalculator.calculateDeliveryCharges(value) + pricingCalculator.calculateTax(value)
    }));
    
    res.json({
      deliveryConfig: pricingCalculator.settings.deliveryConfig,
      taxRate: pricingCalculator.settings.taxRate,
      preview
    });
  } catch (error) {
    console.error('Delivery preview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;