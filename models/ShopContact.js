const mongoose = require('mongoose');

/**
 * A walk-in shop customer imported from the Khatabook export, used to invite
 * them to order online via a one-time WhatsApp welcome message.
 */
const shopContactSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  phone: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ }, // 10-digit Indian mobile
  source: { type: String, default: 'khatabook' },
  welcomeStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'opted_out'],
    default: 'pending'
  },
  welcomeSentAt: Date,
  welcomeError: String,
  importBatch: String, // file name + date of the upload that first added it
  lastSeenAt: { type: Date, default: Date.now } // latest upload that contained it
}, {
  timestamps: true
});

shopContactSchema.index({ welcomeStatus: 1, createdAt: -1 });

module.exports = mongoose.model('ShopContact', shopContactSchema);
