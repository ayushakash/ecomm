const mongoose = require('mongoose');

/** Numbers that asked not to receive WhatsApp messages (STOP reply or marked by admin). Never messaged again. */
const whatsAppOptOutSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ },
  source: { type: String, enum: ['stop_reply', 'admin'], required: true },
  note: { type: String, trim: true, maxlength: 200 },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppOptOut', whatsAppOptOutSchema);
