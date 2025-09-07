const mongoose = require('mongoose');

const orderLogSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'order_created',
      'order_assigned', 
      'order_accepted',
      'order_rejected',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'payment_confirmed',
      'payment_failed',
      'stock_updated',
      'refund_initiated',
      'refund_completed'
    ]
  },
  eventDescription: {
    type: String,
    required: true
  },
  triggeredBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userType: {
      type: String,
      enum: ['admin', 'merchant', 'customer', 'system']
    },
    userName: String,
    userEmail: String
  },
  previousStatus: String,
  newStatus: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  notificationSent: {
    n8n: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      response: mongoose.Schema.Types.Mixed,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    whatsapp: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    }
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
orderLogSchema.index({ orderId: 1, timestamp: -1 });
orderLogSchema.index({ eventType: 1, timestamp: -1 });
orderLogSchema.index({ 'triggeredBy.userId': 1, timestamp: -1 });

module.exports = mongoose.model('OrderLog', orderLogSchema);