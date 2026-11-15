const express = require('express');
const router = express.Router();
const AppSettings = require('../models/AppSettings');

const SITE_URL = (process.env.SITE_URL || process.env.CLIENT_URL || 'https://chardeevari.in').replace(/\/$/, '');

/**
 * GET /app — short link used in WhatsApp bills, reels and QR codes.
 * Redirects to Admin → Settings → "App link" (e.g. the Play Store listing), else the website.
 * 302 + no-store so a change in admin takes effect immediately for everyone.
 */
router.get('/app', async (req, res) => {
  let target = SITE_URL;
  try {
    const settings = await AppSettings.findOne().select('appLinkUrl').lean();
    if (settings?.appLinkUrl) target = settings.appLinkUrl;
  } catch (err) {
    console.error('App link lookup failed, falling back to website:', err.message);
  }
  res.set('Cache-Control', 'no-store');
  res.redirect(302, target);
});

module.exports = router;
