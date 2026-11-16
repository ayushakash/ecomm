const mongoose = require('mongoose');

/** A single WhatsApp message on the API number: customer → us ('in') or admin/auto-reply → customer ('out'). */
const whatsAppMessageSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  direction: { type: String, enum: ['in', 'out'], required: true },
  contentType: { type: String, default: 'text' }, // text, image, document, audio, video, location, button…
  text: { type: String },
  mediaUrl: { type: String },
  filename: { type: String },
  // WhatsApp message id (wamid…) for inbound — unique so webhook retries don't duplicate messages.
  waId: { type: String, unique: true, sparse: true },
  // MSG91 message_uuid for outbound, to match delivery reports.
  providerId: { type: String, index: true, sparse: true },
  status: { type: String, enum: ['received', 'sent', 'delivered', 'read', 'failed'], required: true },
  error: { type: String },
  autoReply: { type: Boolean, default: false },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // When the message was actually sent (customer's WhatsApp timestamp for inbound; send time for outbound).
  at: { type: Date, default: Date.now },
}, { timestamps: true });

whatsAppMessageSchema.index({ phone: 1, at: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
