const mongoose = require('mongoose');

/** An admin-sent push broadcast (offers, announcements) and its delivery counts. */
const pushCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 65 },
  body: { type: String, required: true, trim: true, maxlength: 240 },
  // Where tapping opens; same vocabulary as Banner.ctaType.
  linkType: {
    type: String,
    enum: ['none', 'products', 'category', 'product', 'url', 'calculator'],
    default: 'none'
  },
  linkValue: { type: String, trim: true },
  audience: { type: String, enum: ['all', 'city'], default: 'all' },
  city: { type: String, trim: true },
  recipients: { type: Number, default: 0 }, // customers targeted
  devices: { type: Number, default: 0 }, // tokens messaged
  sent: { type: Number, default: 0 }, // accepted by Expo
  failed: { type: Number, default: 0 },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

pushCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PushCampaign', pushCampaignSchema);
