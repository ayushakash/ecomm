const mongoose = require('mongoose');

/**
 * One WhatsApp bill per sale bill. `key` (bill no + date) is unique, so a bill can never be
 * sent twice no matter how many overlapping sales reports are uploaded.
 */
const billMessageSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  billNo: { type: String, required: true },
  billDate: { type: String, required: true }, // YYYY-MM-DD
  partyName: { type: String, trim: true }, // shown to admins only, never sent
  phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
  total: { type: Number, required: true },
  received: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
  error: { type: String },
  sentAt: { type: Date },
  // What WhatsApp did after MSG91 accepted it (from MSG91 delivery reports, matched by providerId).
  providerId: { type: String, index: true, sparse: true },
  delivery: { type: String, enum: ['sent', 'delivered', 'read', 'failed'] },
  deliveryError: { type: String },
  deliveryAt: { type: Date },
  attempts: { type: Number, default: 0 },
  batchId: { type: String, index: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

billMessageSchema.index({ status: 1, updatedAt: -1 });
billMessageSchema.index({ phone: 1 });

module.exports = mongoose.model('BillMessage', billMessageSchema);
