const mongoose = require('mongoose');

const areaRequestSchema = new mongoose.Schema({
  area: { type: String, required: true, trim: true, maxlength: 100 },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  pincode: { type: String, trim: true, maxlength: 6 },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  name: { type: String, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ type: String, trim: true, maxlength: 40 }],
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

module.exports = mongoose.model('AreaRequest', areaRequestSchema);
