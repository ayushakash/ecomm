const mongoose = require('mongoose');

const cityMasterSchema = new mongoose.Schema({
  cityName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  // Optional: Additional metadata
  pincode: {
    type: String,
    trim: true
  },
  region: {
    type: String,
    enum: ['North', 'South', 'East', 'West', 'Central', 'Northeast'],
    trim: true
  },
  // Optional: Default delivery settings for this city
  defaultDeliveryCharge: {
    type: Number,
    default: 0
  },
  deliveryRadius: {
    type: Number,
    default: 10 // in kilometers
  }
}, {
  timestamps: true
});

// Index for faster queries
cityMasterSchema.index({ cityName: 1, state: 1 });
cityMasterSchema.index({ isActive: 1 });

// Virtual for full location name
cityMasterSchema.virtual('fullName').get(function() {
  return `${this.cityName}, ${this.state}`;
});

// Ensure virtuals are included in JSON
cityMasterSchema.set('toJSON', { virtuals: true });
cityMasterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CityMaster', cityMasterSchema);
