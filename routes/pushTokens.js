const express = require('express');
const router = express.Router();
const PushDevice = require('../models/PushDevice');
const ExpoPushService = require('../services/ExpoPushService');
const { optionalAuth } = require('../middleware/auth');

/**
 * @route  POST /api/push-tokens
 * @desc   Register/refresh this app install for push. Works for guests; with a customer
 *         session the device is attached to that customer, without one it is detached
 *         (so logging out keeps offers coming but stops order updates for the old account).
 * @access Public (optional customer auth)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { token, platform, city, language } = req.body;
    if (!ExpoPushService.isValidToken(token)) {
      return res.status(400).json({ success: false, message: 'Invalid Expo push token' });
    }
    if (platform !== undefined && !['ios', 'android'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'platform must be ios or android' });
    }

    const update = {
      platform,
      user: req.user?.role === 'customer' ? req.user._id : null,
      lastSeenAt: new Date()
    };
    if (typeof city === 'string' && city.trim()) update.city = city.trim().slice(0, 50);
    if (['en', 'hi'].includes(language)) update.language = language;

    await PushDevice.updateOne({ token }, { $set: update }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Push device register error:', err);
    res.status(500).json({ success: false, message: 'Failed to register device' });
  }
});

module.exports = router;
