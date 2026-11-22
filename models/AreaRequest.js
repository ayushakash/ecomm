const mongoose = require('mongoose');

const ITEMS = ['cement', 'sariya', 'balu', 'eent', 'gitti', 'other'];

const areaRequestSchema = new mongoose.Schema({
  area: { type: String, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  pincode: { type: String, trim: true, maxlength: 6 },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  name: { type: String, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ type: String, enum: ITEMS }],
  note: { type: String, trim: true, maxlength: 300 },
  source: { type: String, enum: ['web', 'app'], default: 'web' },
  areaKey: { type: String, index: true },
  count: { type: Number, default: 1 },
  ip: { type: String, select: false }
}, {
  timestamps: true
});

areaRequestSchema.index({ city: 1, area: 1 });
areaRequestSchema.index({ createdAt: -1 });

areaRequestSchema.statics.ITEMS = ITEMS;

module.exports = mongoose.model('AreaRequest', areaRequestSchema);
