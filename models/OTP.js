const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: true,
    enum: ['login', 'registration', 'password_reset', 'phone_verification', 'order_confirmation']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  sentVia: {
    type: String,
    enum: ['sms', 'whatsapp'],
    required: true
  },
  msg91Response: {
    requestId: String,
    type: String,
    message: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  verifiedAt: Date,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for efficient cleanup and queries
otpSchema.index({ phone: 1, purpose: 1, isUsed: 1 });
otpSchema.index({ createdAt: 1 });

module.exports = mongoose.model('OTP', otpSchema);