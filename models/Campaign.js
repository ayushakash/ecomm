const mongoose = require('mongoose');

/**
 * An admin-sent WhatsApp template or email broadcast and its delivery counts.
 * Sent in batches: a follow-up batch continues the same campaign and skips everyone in `sentTo`.
 */
const campaignSchema = new mongoose.Schema({
  channel: { type: String, enum: ['whatsapp', 'email'], required: true },
  audience: { type: String, enum: ['test', 'shop_welcome', 'shop_all', 'customers'], required: true },
  status: { type: String, enum: ['sending', 'done', 'stopped'], default: 'sending' },
  // WhatsApp: the registry entry, plus a snapshot of it at send time.
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
  template: {
    name: String,
    language: String,
    label: String,
    category: String
  },
  // Email
  subject: { type: String, trim: true, maxlength: 150 },
  body: { type: String, maxlength: 5000 },
  ctaText: { type: String, trim: true, maxlength: 40 },
  ctaUrl: { type: String, trim: true, maxlength: 500 },
  testTarget: { type: String, trim: true }, // phone or email when audience is 'test'
  recipients: { type: Number, default: 0 }, // attempted so far (all batches)
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 }, // opted out / invalid, latest batch
  remaining: { type: Number, default: 0 }, // still to send after the latest batch
  errorSample: [{ type: String }], // first few send errors
  sentTo: { type: [String], select: false }, // phones / emails already attempted
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ channel: 1, audience: 1, status: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
