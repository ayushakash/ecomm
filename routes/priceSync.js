const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Static API key for external price sync (e.g. n8n / scripts).
// Sent as `x-api-key: <key>` or `Authorization: Bearer <key>`.
const API_KEY = process.env.PRICE_SYNC_API_KEY || 'Ayushmishra@9';

const requireApiKey = (req, res, next) => {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const key = req.headers['x-api-key'] || bearer;
  if (key !== API_KEY) {
    return res.status(401).json({ message: 'Invalid or missing API key' });
  }
  next();
};

// Round-trippable shape: the GET response objects are valid PUT payloads.
const toPriceView = (p) => ({
  _id: p._id,
  name: p.name,
  sku: p.sku,
  unit: p.unit,
  enabled: p.enabled,
  price: p.price,
  mrp: p.mrp,
  variants: (p.variants || []).map((v) => ({
    _id: v._id,
    label: v.label,
    sku: v.sku,
    price: v.price,
    stock: v.stock,
  })),
  cityPricing: (p.cityPricing || []).map((c) => ({
    cityId: c.cityId?._id || c.cityId,
    cityName: c.cityId?.name,
    price: c.price,
    isAvailable: c.isAvailable,
  })),
});

// @route   GET /api/price-sync/products
// @desc    All products with every admin-set price (base, variants, per-city)
// @access  Static API key
router.get('/products', requireApiKey, async (req, res) => {
  try {
    const products = await Product.find()
      .select('name sku unit enabled price mrp variants cityPricing')
      .populate('cityPricing.cityId', 'name')
      .sort({ name: 1 })
      .lean();
    res.json({ count: products.length, products: products.map(toPriceView) });
  } catch (err) {
    console.error('Price sync GET error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const isValidPrice = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

// @route   PUT /api/price-sync/products
// @desc    Update prices only. Body = one product or an array in the GET shape;
//          every non-price field is ignored, so "copy response, edit price, send
//          back" is safe. Matches product by _id (fallback sku), variant by _id
//          (fallback label/sku), city price by cityId.
// @access  Static API key
router.put('/products', requireApiKey, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.products || [req.body];
  if (!items.length || !items.every((i) => i && typeof i === 'object')) {
    return res.status(400).json({ message: 'Body must be a product object or array of them' });
  }

  const results = [];
  for (const item of items) {
    const ref = item._id || item.sku || '(unknown)';
    try {
      const product = item._id && mongoose.Types.ObjectId.isValid(item._id)
        ? await Product.findById(item._id)
        : item.sku
          ? await Product.findOne({ sku: item.sku })
          : null;
      if (!product) {
        results.push({ product: ref, status: 'not_found' });
        continue;
      }

      const changes = [];

      if (item.price !== undefined && item.price !== product.price) {
        if (!isValidPrice(item.price)) throw new Error(`invalid price: ${item.price}`);
        changes.push(`price ${product.price} -> ${item.price}`);
        product.price = item.price;
      }

      if (item.mrp !== undefined && item.mrp !== product.mrp) {
        if (!isValidPrice(item.mrp)) throw new Error(`invalid mrp: ${item.mrp}`);
        changes.push(`mrp ${product.mrp} -> ${item.mrp}`);
        product.mrp = item.mrp;
      }

      for (const v of item.variants || []) {
        const target = product.variants.find(
          (pv) =>
            (v._id && pv._id.equals(v._id)) ||
            (v.sku && pv.sku && pv.sku === v.sku) ||
            (v.label && pv.label === v.label)
        );
        if (!target) {
          results.push({ product: ref, status: 'variant_not_found', variant: v._id || v.label || v.sku });
          continue;
        }
        if (v.price !== undefined && v.price !== target.price) {
          if (!isValidPrice(v.price)) throw new Error(`invalid variant price: ${v.price}`);
          changes.push(`variant ${target.label} ${target.price} -> ${v.price}`);
          target.price = v.price;
        }
      }

      for (const c of item.cityPricing || []) {
        if (!c.cityId) continue;
        const target = product.cityPricing.find((pc) => String(pc.cityId) === String(c.cityId));
        if (!target) {
          results.push({ product: ref, status: 'city_price_not_found', cityId: c.cityId });
          continue;
        }
        if (c.price !== undefined && c.price !== target.price) {
          if (!isValidPrice(c.price)) throw new Error(`invalid city price: ${c.price}`);
          changes.push(`city ${c.cityId} ${target.price} -> ${c.price}`);
          target.price = c.price;
        }
      }

      if (changes.length) {
        await product.save();
        results.push({ product: ref, status: 'updated', changes });
      } else {
        results.push({ product: ref, status: 'unchanged' });
      }
    } catch (err) {
      results.push({ product: ref, status: 'error', message: err.message });
    }
  }

  const updated = results.filter((r) => r.status === 'updated').length;
  res.json({ updated, total: items.length, results });
});

module.exports = router;
