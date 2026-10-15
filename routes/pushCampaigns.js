const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Address = require('../models/Address');
const PushCampaign = require('../models/PushCampaign');
const ExpoPushService = require('../services/ExpoPushService');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/** chardeevari:// deep link (or https URL) the app opens on tap; undefined = just open the app. */
const linkUrl = (type, value) => {
  switch (type) {
    case 'products': return 'chardeevari://products';
    case 'category': return value ? `chardeevari://products?categoryId=${encodeURIComponent(value)}` : undefined;
    case 'product': return value ? `chardeevari://product/${encodeURIComponent(value)}` : undefined;
    case 'calculator': return 'chardeevari://calculator';
    case 'url': return /^https?:\/\//i.test(value || '') ? value : undefined;
    default: return undefined;
  }
};

/** Customers with at least one registered device in the audience. */
const audienceFilter = async (audience, city) => {
  const filter = { role: 'customer', isActive: true, 'pushTokens.0': { $exists: true } };
  if (audience === 'city') {
    const userIds = await Address.distinct('user', {
      city: new RegExp(`^${city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      isActive: { $ne: false }
    });
    filter._id = { $in: userIds };
  }
  return filter;
};

const validate = ({ title, body, audience = 'all', city, linkType = 'none', linkValue }) => {
  if (!title?.trim() || !body?.trim()) return 'Title and message are required';
  if (!['all', 'city'].includes(audience)) return 'Invalid audience';
  if (audience === 'city' && !city?.trim()) return 'City is required for a city audience';
  if (['category', 'product', 'url'].includes(linkType) && !linkUrl(linkType, linkValue)) {
    return linkType === 'url' ? 'Link must start with http:// or https://' : 'Choose what to open';
  }
  return null;
};

/**
 * @route  GET /api/push-campaigns/audience?audience=all|city&city=Ranchi
 * @desc   How many customers / devices a broadcast would reach
 * @access Admin
 */
router.get('/audience', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { audience = 'all', city = '' } = req.query;
    if (audience === 'city' && !city.trim()) return res.json({ success: true, customers: 0, devices: 0 });
    const users = await User.find(await audienceFilter(audience, city)).select('pushTokens').lean();
    res.json({
      success: true,
      customers: users.length,
      devices: users.reduce((n, u) => n + u.pushTokens.length, 0)
    });
  } catch (err) {
    console.error('Push audience error:', err);
    res.status(500).json({ success: false, message: 'Failed to count audience' });
  }
});

/**
 * @route  GET /api/push-campaigns
 * @desc   Recent broadcasts
 * @access Admin
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const campaigns = await PushCampaign.find().sort({ createdAt: -1 }).limit(50).populate('sentBy', 'name').lean();
    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('Push campaigns list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

/**
 * @route  POST /api/push-campaigns
 * @desc   Send a push broadcast to customers now
 * @access Admin
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const { title, body, audience = 'all', city, linkType = 'none', linkValue } = req.body;
    const users = await User.find(await audienceFilter(audience, city)).select('pushTokens').lean();
    const deviceTokens = users.flatMap(u => u.pushTokens.map(t => t.token));
    if (deviceTokens.length === 0) {
      return res.status(400).json({ success: false, message: 'No customers with the app and notifications enabled in this audience yet' });
    }

    const url = linkUrl(linkType, linkValue);
    const result = await ExpoPushService.sendNotifications([{
      deviceTokens,
      title: title.trim(),
      body: body.trim(),
      channelId: ExpoPushService.CHANNELS.OFFERS,
      data: { type: 'campaign', ...(url && { url }) }
    }]);

    const campaign = await PushCampaign.create({
      title,
      body,
      linkType,
      linkValue: linkType === 'none' ? undefined : linkValue,
      audience,
      city: audience === 'city' ? city.trim() : undefined,
      recipients: users.length,
      devices: deviceTokens.length,
      sent: result.messagesSent || 0,
      failed: result.failed ?? deviceTokens.length,
      sentBy: req.user._id
    });

    res.status(201).json({ success: true, campaign });
  } catch (err) {
    console.error('Push campaign send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

module.exports = router;
