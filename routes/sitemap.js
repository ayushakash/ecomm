const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Public site URL — configurable, defaults to production domain.
const SITE_URL = (process.env.SITE_URL || process.env.CLIENT_URL || 'https://chardeevari.in').replace(/\/$/, '');

// Static, crawlable public pages (must match robots.txt Allow list).
const STATIC_PATHS = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/calculator', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  // Blog articles — keep in sync with client/src/data/blogPosts.js
  { path: '/blog/cement-calculation-1000-sqft-ranchi', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/msand-vs-river-sand-jharkhand', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/best-tmt-bars-ranchi-2026', changefreq: 'monthly', priority: '0.7' },
];

const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// GET /sitemap.xml — dynamic sitemap of static pages + all enabled products.
router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await Product.find({ enabled: true })
      .select('_id updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean();

    const urls = [];

    for (const p of STATIC_PATHS) {
      urls.push(
        `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      );
    }

    for (const prod of products) {
      const lastmod = prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : null;
      urls.push(
        `  <url>\n    <loc>${SITE_URL}/products/${xmlEscape(prod._id)}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
        `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
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
