const mongoose = require('mongoose');

/**
 * An MSG91/Meta WhatsApp template the admin registered for campaigns. Body, buttons, category
 * and status are copied from MSG91; `variables` says how to fill each body {{n}} per recipient.
 */
const whatsAppTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, match: /^[a-z0-9_]+$/ },
  language: { type: String, required: true, trim: true, default: 'en' },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, trim: true }, // MARKETING / UTILITY / AUTHENTICATION
  body: { type: String, default: '' },
  buttons: [new mongoose.Schema({ type: { type: String }, text: String }, { _id: false })],
  variableCount: { type: Number, default: 0 },
  // One entry per body {{n}}, in order. 'name' → recipient name (value = fallback); 'static' → value.
  variables: [{
    _id: false,
    source: { type: String, enum: ['name', 'static'], default: 'static' },
    value: { type: String, trim: true, maxlength: 1000, default: '' }
  }],
  status: { type: String, trim: true }, // approved / pending / rejected … as cached from MSG91
  statusCheckedAt: Date,
  enabled: { type: Boolean, default: true }
}, {
  timestamps: true
});

whatsAppTemplateSchema.index({ name: 1, language: 1 }, { unique: true });

module.exports = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
