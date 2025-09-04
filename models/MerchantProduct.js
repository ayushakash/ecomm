const mongoose = require('mongoose');
const merchantProductSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, 
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

merchantProductSchema.index({ merchantId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('MerchantProduct', merchantProductSchema);
