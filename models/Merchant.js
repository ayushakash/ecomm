const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Merchant name is required'],
    trim: true
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true
    }
  },
  area: {
    type: String,
    required: [true, 'Area is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    trim: true
  },
  activeStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  documents: {
    gstNumber: {
      type: String,
      trim: true
    },
    panNumber: {
      type: String,
      trim: true
    },
    businessLicense: {
      type: String,
      trim: true
    }
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  completedOrders: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for area-based queries
merchantSchema.index({ area: 1, activeStatus: 1 });

module.exports = mongoose.model('Merchant', merchantSchema);
