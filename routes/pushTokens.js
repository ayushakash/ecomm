const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ExpoPushService = require('../services/ExpoPushService');
const { verifyToken, requireCustomer } = require('../middleware/auth');

// A customer rarely has more than a few devices; cap to stop unbounded growth.
const MAX_TOKENS_PER_USER = 10;

/**
 * @route  POST /api/push-tokens
 * @desc   Register this device's Expo push token for the signed-in customer
 * @access Customer
 */
router.post('/', verifyToken, requireCustomer, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!ExpoPushService.isValidToken(token)) {
      return res.status(400).json({ success: false, message: 'Invalid Expo push token' });
    }
    if (platform !== undefined && !['ios', 'android'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'platform must be ios or android' });
    }

    // A device belongs to one account at a time: detach it from anyone else first.
    await User.updateMany({ _id: { $ne: req.user._id }, 'pushTokens.token': token }, { $pull: { pushTokens: { token } } });
    await User.updateOne({ _id: req.user._id }, { $pull: { pushTokens: { token } } });
    await User.updateOne(
      { _id: req.user._id },
      { $push: { pushTokens: { $each: [{ token, platform, updatedAt: new Date() }], $slice: -MAX_TOKENS_PER_USER } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Push token register error:', err);
    res.status(500).json({ success: false, message: 'Failed to register push token' });
  }
});

/**
 * @route  DELETE /api/push-tokens
 * @desc   Unregister a device (called on logout)
 * @access Customer
 */
router.delete('/', verifyToken, requireCustomer, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    await User.updateOne({ _id: req.user._id }, { $pull: { pushTokens: { token } } });
    res.json({ success: true });
  } catch (err) {
    console.error('Push token unregister error:', err);
    res.status(500).json({ success: false, message: 'Failed to unregister push token' });
  }
});

module.exports = router;
