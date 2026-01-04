const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['search', 'product_view', 'add_to_cart', 'checkout', 'purchase', 'calculator_use', 'page_view'],
    index: true
  },
  searchTerm: {
    type: String,
    index: true,
    trim: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  productName: String,
  category: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for common queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ searchTerm: 1, timestamp: -1 });
analyticsSchema.index({ productId: 1, eventType: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
