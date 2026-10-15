const mongoose = require('mongoose');

/**
 * Admin-managed offer slide for the mobile home hero carousel.
 * Text is drawn over `imageUrl` when present, otherwise over a gradient.
 */
const bannerSchema = new mongoose.Schema({
  badge: { type: String, trim: true, maxlength: 60 },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  highlight: { type: String, trim: true, maxlength: 40 },
  body: { type: String, trim: true, maxlength: 200 },
  imageUrl: { type: String, trim: true },
  gradientFrom: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: '#2C3E54' },
  gradientTo: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: '#1E2A3A' },
  // What tapping the slide does. `ctaValue` = category id | product id | URL, per type.
  ctaType: {
    type: String,
    enum: ['none', 'products', 'category', 'product', 'url', 'whatsapp', 'calculator'],
    default: 'none'
  },
  ctaValue: { type: String, trim: true },
  ctaLabel: { type: String, trim: true, maxlength: 30 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  startsAt: { type: Date },
  endsAt: { type: Date }
}, {
  timestamps: true
});

bannerSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
