const express = require('express');
const rateLimit = require('express-rate-limit');
const GeocodingService = require('../services/GeocodingService');

const router = express.Router();

// Public (guests pick locations too) but metered: protects the Ola quota.
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many location requests, please slow down.' },
  }),
);

const coord = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// @route   GET /api/geo/reverse?lat=&lng=
// @desc    Coordinates → place (area, city, state, pincode, formattedAddress)
// @access  Public
router.get('/reverse', async (req, res) => {
  const latitude = coord(req.query.lat);
  const longitude = coord(req.query.lng);
  if (latitude === undefined || longitude === undefined || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return res.status(400).json({ success: false, message: 'Valid lat and lng are required' });
  }
  const place = await GeocodingService.reverse(latitude, longitude);
  if (!place) return res.status(404).json({ success: false, message: 'No address found for these coordinates' });
  res.json({ success: true, place });
});

// @route   GET /api/geo/search?q=&lat=&lng=
// @desc    Search-as-you-type suggestions (biased toward lat/lng, default Ranchi)
// @access  Public
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  const latitude = coord(req.query.lat);
  const longitude = coord(req.query.lng);
  const near = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;
  const results = await GeocodingService.search(q, near);
  res.json({ success: true, results });
});

// @route   GET /api/geo/geocode?address=
// @desc    Address text → best place with coordinates
// @access  Public
router.get('/geocode', async (req, res) => {
  const address = String(req.query.address || '').trim().slice(0, 300);
  if (!address) return res.status(400).json({ success: false, message: 'address is required' });
  const place = await GeocodingService.geocode(address);
  if (!place) return res.status(404).json({ success: false, message: 'No coordinates found for this address' });
  res.json({ success: true, place });
});

module.exports = router;
