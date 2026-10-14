const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const MerchantProduct = require('../models/MerchantProduct');
const { getPricingCalculator } = require('../utils/pricingUtils');

// Public site URL — keep in sync with routes/sitemap.js and routes/og.js.
const SITE_URL = (process.env.SITE_URL || process.env.CLIENT_URL || 'https://chardeevari.in').replace(/\/$/, '');

// Exact header from Meta's official catalog_products.csv template.
const HEADER = [
  'id', 'title', 'description', 'availability', 'condition', 'price', 'link',
  'image_link', 'brand', 'google_product_category', 'fb_product_category',
  'quantity_to_sell_on_facebook', 'sale_price', 'sale_price_effective_date',
  'item_group_id', 'gender', 'color', 'size', 'age_group', 'material',
  'pattern', 'shipping', 'shipping_weight', 'offer_disclaimer',
  'offer_disclaimer_url', 'video[0].url', 'video[0].tag[0]', 'gtin',
  'product_tags[0]', 'product_tags[1]', 'style[0]',
];

// CSV escaping: strip CR/LF (Meta wants plain text), quote when needed,
// double any internal quotes.
const csvField = (v) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const formatPrice = (n) => `${Number(n).toFixed(2)} INR`;

const absImage = (img) => {
  if (!img) return '';
  if (/^https?:\/\//i.test(img)) return img;
  return `${SITE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
};

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// @route   GET /api/meta/catalog-feed
// @desc    Meta Commerce Catalog product feed (CSV). Intentionally public:
//          Meta Commerce Manager polls this URL on a schedule.
//          Prices come from the same customer-facing display logic as the
//          storefront (PricingCalculator.getDisplayPrice — admin panel price
//          under the default priceDisplayMode, GST handling included).
// @access  Public
router.get('/catalog-feed', async (req, res) => {
  try {
    const [pricingCalculator, products, activeMerchantIds] = await Promise.all([
      getPricingCalculator(),
      Product.find({ enabled: true })
        .select('name description sku price unit weight enabled images tags specifications.brand gstRate gstType variants cityPricing')
        .lean(),
      Merchant.find({ activeStatus: { $in: ['approved', 'active'] }, isActive: true }).distinct('_id'),
    ]);

    // Batch stock lookup (mirrors customer availability logic in routes/products.js):
    // one query for every enabled merchant-product row of an active merchant.
    const merchantProducts = products.length
      ? await MerchantProduct.find({
          productId: { $in: products.map((p) => p._id) },
          merchantId: { $in: activeMerchantIds },
          enabled: true,
        })
          .select('productId stock variantPricing')
          .lean()
      : [];

    // productId -> { baseStock, variantStock: { label -> stock } }
    const stockByProduct = new Map();
    for (const mp of merchantProducts) {
      const key = String(mp.productId);
      const entry = stockByProduct.get(key) || { baseStock: 0, variantStock: {} };
      entry.baseStock += mp.stock || 0;
      for (const vp of mp.variantPricing || []) {
        entry.variantStock[vp.label] = (entry.variantStock[vp.label] || 0) + (vp.stock || 0);
      }
      stockByProduct.set(key, entry);
    }

    const rows = [HEADER.join(',')];
    for (const product of products) {
      const stock = stockByProduct.get(String(product._id)) || { baseStock: 0, variantStock: {} };
      const link = `${SITE_URL}/products/${product._id}`;
      const image = absImage(product.images?.[0]);
      const base = {
        description: (product.description || '').slice(0, 9999),
        brand: product.specifications?.brand || '',
        shippingWeight: product.weight > 0 ? `${product.weight} kg` : '',
        tag0: product.tags?.[0] || '',
        tag1: product.tags?.[1] || '',
      };

      const makeRow = (o) => {
        const cells = {
          id: o.id,
          title: o.title,
          description: base.description,
          availability: o.qty > 0 ? 'in stock' : 'out of stock',
          condition: 'new',
          price: formatPrice(o.price),
          link,
          image_link: image,
          brand: base.brand,
          quantity_to_sell_on_facebook: o.qty > 0 ? String(o.qty) : '',
          item_group_id: o.groupId || '',
          shipping_weight: base.shippingWeight,
          'product_tags[0]': base.tag0,
          'product_tags[1]': base.tag1,
        };
        return HEADER.map((h) => csvField(cells[h] ?? '')).join(',');
      };

      if (product.variants?.length) {
        // One row per variant; grouped under the parent product id.
        // IDs use Mongo _id to match the Meta Pixel's content_ids
        // (client sends product._id in ViewContent/AddToCart) — required
        // for dynamic ads / retargeting to match catalog items.
        for (const v of product.variants) {
          rows.push(makeRow({
            id: `${product._id}-${slugify(v.label)}`,
            title: `${product.name} (${v.label})`,
            // Variant price is shown to customers as stored (see routes/products.js GET /:id).
            price: v.price,
            qty: stock.variantStock[v.label] || 0,
            groupId: String(product._id),
          }));
        }
      } else {
        rows.push(makeRow({
          id: String(product._id),
          title: product.name,
          // Same customer-facing price the storefront shows.
          price: await pricingCalculator.getDisplayPrice(product),
          qty: stock.baseStock,
        }));
      }
    }

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(rows.join('\n') + '\n');
  } catch (err) {
    console.error('Meta catalog feed error:', err);
    res.status(500).json({ message: 'Error generating catalog feed' });
  }
});

module.exports = router;
