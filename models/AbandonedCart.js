const mongoose = require('mongoose');

const abandonedCartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: String,
  cartItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalValue: {
    type: Number,
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  notificationsSent: [{
    type: {
      type: String,
      enum: ['15min', '1hour', '24hour', '3days']
    },
    sentAt: Date,
    channel: {
      type: String,
      enum: ['n8n', 'sms', 'whatsapp', 'email']
    },
    success: Boolean,
    messageId: String
  }],
  isConverted: {
    type: Boolean,
    default: false
  },
  convertedAt: Date,
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  userDetails: {
    name: String,
    email: String,
    phone: String
  }
}, {
  timestamps: true
});

// Index for abandoned cart cleanup and notifications
abandonedCartSchema.index({ lastActivity: 1 });
abandonedCartSchema.index({ userId: 1, isConverted: 1 });
abandonedCartSchema.index({ createdAt: 1 });

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);