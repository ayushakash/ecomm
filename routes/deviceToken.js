const express = require('express');
const { body, validationResult } = require('express-validator');
const Merchant = require('../models/Merchant');
const { verifyToken, requireMerchantOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Register device token for push notifications
 * POST /api/merchants/device-token
 */
router.post('/', [
  verifyToken,
  requireMerchantOrAdmin,
  body('deviceToken').notEmpty().withMessage('Device token is required'),
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('platform').isIn(['ios', 'android']).withMessage('Platform must be ios or android')
], async (req, res) => {
  try {
    console.log('📱 Device token registration request received');
    console.log('   Token:', req.body.deviceToken?.substring(0, 50) + '...');
    console.log('   Device ID:', req.body.deviceId);
    console.log('   Platform:', req.body.platform);
    console.log('   User:', req.user?.name);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceToken, deviceId, platform } = req.body;

    // Find the merchant
    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Check if device token already exists
    const existingTokenIndex = merchant.deviceTokens.findIndex(
      dt => dt.deviceId === deviceId || dt.token === deviceToken
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      merchant.deviceTokens[existingTokenIndex] = {
        token: deviceToken,
        deviceId,
        platform,
        isActive: true,
        lastUsed: new Date()
      };
    } else {
      // Add new device token
      merchant.deviceTokens.push({
        token: deviceToken,
        deviceId,
        platform,
        isActive: true,
        lastUsed: new Date()
      });
    }

    await merchant.save();

    res.json({
      success: true,
      message: 'Device token registered successfully',
      tokenCount: merchant.deviceTokens.length
    });

  } catch (error) {
    console.error('Device token registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update device token status
 * PUT /api/merchants/device-token
 */
router.put('/', [
  verifyToken,
  requireMerchantOrAdmin,
  body('deviceToken').notEmpty().withMessage('Device token is required'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceToken, isActive } = req.body;

    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Find and update the device token
    const tokenIndex = merchant.deviceTokens.findIndex(dt => dt.token === deviceToken);

    if (tokenIndex === -1) {
      return res.status(404).json({ message: 'Device token not found' });
    }

    merchant.deviceTokens[tokenIndex].isActive = isActive;
    merchant.deviceTokens[tokenIndex].lastUsed = new Date();

    await merchant.save();

    res.json({
      success: true,
      message: `Device token ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Device token update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Remove device token
 * DELETE /api/merchants/device-token
 */
router.delete('/', [
  verifyToken,
  requireMerchantOrAdmin,
  body('deviceToken').notEmpty().withMessage('Device token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceToken } = req.body;

    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Remove the device token
    const originalLength = merchant.deviceTokens.length;
    merchant.deviceTokens = merchant.deviceTokens.filter(dt => dt.token !== deviceToken);

    if (merchant.deviceTokens.length === originalLength) {
      return res.status(404).json({ message: 'Device token not found' });
    }

    await merchant.save();

    res.json({
      success: true,
      message: 'Device token removed successfully',
      remainingTokens: merchant.deviceTokens.length
    });

  } catch (error) {
    console.error('Device token removal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get merchant's device tokens
 * GET /api/merchants/device-token
 */
router.get('/', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id).select('deviceTokens notificationSettings');

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    res.json({
      success: true,
      deviceTokens: merchant.deviceTokens.map(dt => ({
        deviceId: dt.deviceId,
        platform: dt.platform,
        isActive: dt.isActive,
        lastUsed: dt.lastUsed,
        // Don't expose the actual token for security
        hasToken: !!dt.token
      })),
      notificationSettings: merchant.notificationSettings
    });

  } catch (error) {
    console.error('Get device tokens error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update notification settings
 * PUT /api/merchants/notification-settings
 */
router.put('/notification-settings', [
  verifyToken,
  requireMerchantOrAdmin,
  body('pushEnabled').optional().isBoolean(),
  body('newOrders').optional().isBoolean(),
  body('orderUpdates').optional().isBoolean(),
  body('quietHoursEnabled').optional().isBoolean(),
  body('quietHoursStart').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('quietHoursEnd').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Update notification settings
    const allowedSettings = ['pushEnabled', 'newOrders', 'orderUpdates', 'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd'];

    allowedSettings.forEach(setting => {
      if (req.body[setting] !== undefined) {
        merchant.notificationSettings[setting] = req.body[setting];
      }
    });

    await merchant.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: merchant.notificationSettings
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;