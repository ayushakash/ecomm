const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const EDITABLE = [
  'badge', 'title', 'highlight', 'body', 'imageUrl', 'gradientFrom', 'gradientTo',
  'ctaType', 'ctaValue', 'ctaLabel', 'isActive', 'sortOrder', 'startsAt', 'endsAt'
];

const pickEditable = (src) => {
  const out = {};
  for (const key of EDITABLE) {
    if (src[key] === undefined) continue;
    // Empty date inputs clear the schedule bound.
    out[key] = (key === 'startsAt' || key === 'endsAt') && !src[key] ? null : src[key];
  }
  return out;
};

const sendError = (res, err, fallback) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

/**
 * @route  GET /api/banners
 * @desc   Live banners for the app carousel (active and within their schedule)
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const banners = await Banner.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }
      ]
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('-__v -isActive -startsAt -endsAt -createdAt -updatedAt')
      .lean();
    res.json({ success: true, banners });
  } catch (err) {
    sendError(res, err, 'Failed to load banners');
  }
});

/**
 * @route  GET /api/banners/admin
 * @desc   All banners including inactive/scheduled
 * @access Admin
 */
router.get('/admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ success: true, banners });
  } catch (err) {
    sendError(res, err, 'Failed to load banners');
  }
});

/**
 * @route  POST /api/banners
 * @access Admin
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.create(pickEditable(req.body));
    res.status(201).json({ success: true, banner });
  } catch (err) {
    sendError(res, err, 'Failed to create banner');
  }
});

/**
 * @route  PUT /api/banners/:id
 * @access Admin
 */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, pickEditable(req.body), {
      new: true,
      runValidators: true
    });
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true, banner });
  } catch (err) {
    sendError(res, err, 'Failed to update banner');
  }
});

/**
 * @route  DELETE /api/banners/:id
 * @access Admin
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, 'Failed to delete banner');
  }
});

module.exports = router;
