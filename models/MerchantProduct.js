const mongoose = require('mongoose');

const merchantProductSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product',  required: true },

  // For non-variant products
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },

  // For variant products — mirrors the master product variants with merchant-specific price/stock
  variantPricing: [{
    label: { type: String, required: true, trim: true }, // must match Product.variants[].label
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 }
  }],

  enabled: { type: Boolean, default: true }
}, { timestamps: true });

merchantProductSchema.index({ merchantId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('MerchantProduct', merchantProductSchema);
