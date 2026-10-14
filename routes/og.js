const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Public site URL — keep in sync with routes/sitemap.js.
const SITE_URL = (process.env.SITE_URL || process.env.CLIENT_URL || 'https://chardeevari.in').replace(/\/$/, '');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const absUrl = (u) => (u && /^https?:\/\//i.test(u) ? u : `${SITE_URL}${u || '/logo512.png'}`);

// GET /api/og/products/:id
// Minimal HTML for link scrapers (WhatsApp, Facebook, Twitter, Telegram...).
// They don't execute JS, so the SPA shell shows generic tags; the frontend
// nginx rewrites scraper user-agents for /products/:id to this route.
router.get('/products/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).send('Not found');
    }
    const product = await Product.findOne({ _id: req.params.id, enabled: true })
      .select('name description images price unit specifications.brand')
      .lean();
    if (!product) return res.status(404).send('Not found');

    const pageUrl = `${SITE_URL}/products/${product._id}`;
    const title = `${product.name} - Buy Online in Ranchi | Chardeevari`;
    const description = (product.description || '').slice(0, 300);
    const image = absUrl(product.images?.[0]);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image,
      url: pageUrl,
      ...(product.specifications?.brand && {
        brand: { '@type': 'Brand', name: product.specifications.brand },
      }),
      ...(product.price > 0 && {
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: pageUrl,
        },
      }),
    };

    const html = `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="Chardeevari">
<meta property="og:locale" content="en_IN">
${product.price > 0 ? `<meta property="product:price:amount" content="${esc(product.price)}">
<meta property="product:price:currency" content="INR">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<h1>${esc(product.name)}</h1>
<p>${esc(description)}</p>
<a href="${esc(pageUrl)}">View product on Chardeevari</a>
</body>
</html>`;

    res.header('Content-Type', 'text/html; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (err) {
    console.error('OG render error:', err);
    res.status(500).send('Error');
  }
});

module.exports = router;
