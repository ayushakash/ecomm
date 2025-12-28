const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  images: [{ type: String, trim: true }],
  specifications: {
    brand: { type: String, trim: true },
    grade: { type: String, trim: true },
    weight: { type: Number, min: 0 },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  tags: [{ type: String, trim: true }],
  enabled: { type: Boolean, default: true },

  // 👉 SKU field
  sku: { type: String, unique: true, index: true },

  // ✅ Master catalog fields
  price: { type: Number, default: 0 }, // base/fallback price
  unit: {
    type: String,
    enum: ["kg", "ton", "bag", "piece", "cubic-meter", "sq-ft"],
    default: "piece"
  },
  weight: { type: Number, default: 0, min: 0 }, // weight in kg for delivery calculations

  // 🌍 City-specific pricing
  cityPricing: [{
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityMaster',
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],

  // GST rate for this product (in percentage)
  gstRate: {
    type: Number,
    default: 18, // Default 18% GST
    enum: [0, 5, 12, 18, 28], // Valid GST rates in India
    required: true
  },

  // GST type - how GST is applied to the price
  gstType: {
    type: String,
    enum: ['inclusive', 'exclusive', 'no-gst'],
    default: 'exclusive',
    required: true
  }

}, { timestamps: true });

// Indexes
productSchema.index({ category: 1, enabled: 1 });
productSchema.index({ name: 'text', description: 'text' });

// 👉 Auto-generate SKU before saving
productSchema.pre("save", async function (next) {
  if (this.sku) return next(); // skip if already exists (like update)

  try {
    const Category = mongoose.model("Category");
    const categoryDoc = await Category.findById(this.category).lean();
    const categoryCode = categoryDoc?.code || categoryDoc?.name?.substring(0, 3).toUpperCase();

    const brandCode = this.specifications?.brand
      ? this.specifications.brand.substring(0, 3).toUpperCase()
      : "GEN";

    const prefix = `${categoryCode}-${brandCode}`;

    const Product = mongoose.model("Product");
    const lastProduct = await Product.findOne({ sku: new RegExp(`^${prefix}-`) })
      .sort({ sku: -1 })
      .lean();

    let nextNumber = 1;
    if (lastProduct) {
      const lastSeq = parseInt(lastProduct.sku.split("-").pop(), 10);
      nextNumber = lastSeq + 1;
    }

    this.sku = `${prefix}-${String(nextNumber).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Product', productSchema);
