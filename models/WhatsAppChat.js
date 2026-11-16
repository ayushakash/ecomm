const mongoose = require('mongoose');

/** One conversation per customer phone on the WhatsApp API number (summary for the admin chat list). */
const whatsAppChatSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ },
  name: { type: String, trim: true }, // WhatsApp profile name, else party name from their bills
  lastText: { type: String, trim: true },
  lastDirection: { type: String, enum: ['in', 'out'] },
  lastMessageAt: { type: Date, index: true },
  // WhatsApp allows free-text replies only within 24 h of the customer's last message.
  lastInboundAt: { type: Date },
  lastAutoReplyAt: { type: Date },
  unread: { type: Number, default: 0 },
}, { timestamps: true });

whatsAppChatSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('WhatsAppChat', whatsAppChatSchema);
