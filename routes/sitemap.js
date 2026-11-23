const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Public site URL — configurable, defaults to production domain.
const SITE_URL = (process.env.SITE_URL || process.env.CLIENT_URL || 'https://chardeevari.in').replace(/\/$/, '');

// Indexable public pages. Keep in sync with client App.js routes, package.json
// reactSnap.include, client/nginx.conf ($is_spa_route) and landingConfig.js.
// `prices: true` pages show live prices: their lastmod is the latest product
// update. Other pages carry the date their content last changed.
// (/delete-account is intentionally absent: noindex, kept only for Play Store.)
const STATIC_PATHS = [
  { path: '/', prices: true },
  { path: '/products', prices: true },
  { path: '/aaj-ka-rate', prices: true },
  { path: '/cement-price-ranchi', prices: true },
  { path: '/tmt-steel-price-ranchi', prices: true },
  { path: '/bricks-supplier-ranchi', prices: true },
  { path: '/sand-supplier-ranchi', prices: true },
  { path: '/gitti-rate-ranchi', prices: true },
  { path: '/construction-materials-ranchi', prices: true },
  { path: '/calculator', lastmod: '2026-11-23' },
  { path: '/about', lastmod: '2026-11-23' },
  { path: '/contact', lastmod: '2026-11-23' },
  { path: '/blog', lastmod: '2026-11-23' },
  { path: '/privacy-policy', lastmod: '2026-11-23' },
  // Blog articles — keep in sync with client/src/data/blogPosts.js (dateModified)
  { path: '/blog/cement-calculation-1000-sqft-ranchi', lastmod: '2026-11-23' },
  { path: '/blog/msand-vs-river-sand-jharkhand', lastmod: '2026-11-23' },
  { path: '/blog/best-tmt-bars-ranchi-2026', lastmod: '2026-11-23' },
];

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const day = (date) => new Date(date).toISOString().split('T')[0];

const urlEntry = (loc, lastmod, images = []) =>
  `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n` +
  (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
  images.map((src) => `    <image:image><image:loc>${xmlEscape(src)}</image:loc></image:image>\n`).join('') +
  `  </url>`;

// GET /sitemap.xml — dynamic sitemap of static pages + all enabled products.
router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await Product.find({ enabled: true })
      .select('_id updatedAt images')
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean();

    const latestPriceChange = products[0]?.updatedAt ? day(products[0].updatedAt) : null;

    const urls = STATIC_PATHS.map((p) =>
      urlEntry(`${SITE_URL}${p.path}`, p.prices ? latestPriceChange : p.lastmod)
    );

    for (const prod of products) {
      const images = (prod.images || []).filter((src) => /^https?:\/\//i.test(src));
      urls.push(
        urlEntry(`${SITE_URL}/products/${prod._id}`, prod.updatedAt ? day(prod.updatedAt) : null, images)
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      urls.join('\n') +
      `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // cache 1h
    res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
