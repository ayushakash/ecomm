const mongoose = require('mongoose');

/**
 * One installed app that allowed notifications. Guests have no `user`; logging in
 * attaches the device to the customer, logging out detaches it (it keeps getting offers).
 */
const pushDeviceSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true }, // Expo push token
  platform: { type: String, enum: ['ios', 'android'] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  city: { type: String, trim: true }, // city picked in the app (guests) or delivery city
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
  lastSeenAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

pushDeviceSchema.index({ city: 1 });

module.exports = mongoose.model('PushDevice', pushDeviceSchema);
