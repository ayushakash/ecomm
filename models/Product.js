const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['cement', 'sand', 'tmt-bars', 'bricks', 'aggregates', 'steel', 'tools', 'other'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'ton', 'bag', 'piece', 'cubic-meter', 'sq-ft'],
    default: 'kg'
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: [true, 'Merchant ID is required']
  },
  enabled: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String,
    trim: true
  }],
  specifications: {
    brand: {
      type: String,
      trim: true
    },
    grade: {
      type: String,
      trim: true
    },
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  deliveryTime: {
    type: Number,
    default: 1, // in days
    min: 1
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
productSchema.index({ category: 1, enabled: 1 });
productSchema.index({ merchantId: 1, enabled: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
