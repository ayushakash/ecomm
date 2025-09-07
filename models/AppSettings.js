const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  // Pricing Configuration
  taxRate: {
    type: Number,
    default: 0.18, // 18% GST
    min: 0,
    max: 1
  },
  
  // Delivery Configuration
  deliveryConfig: {
    type: {
      type: String,
      enum: ['fixed', 'threshold', 'distance', 'weight'],
      default: 'threshold'
    },
    
    // Fixed delivery
    fixedCharge: {
      type: Number,
      default: 50
    },
    
    // Threshold-based delivery
    freeDeliveryThreshold: {
      type: Number,
      default: 1000
    },
    chargeForBelowThreshold: {
      type: Number,
      default: 100
    },
    
    // Distance-based delivery (future enhancement)
    perKmRate: {
      type: Number,
      default: 5
    },
    baseDistance: {
      type: Number,
      default: 5 // Free delivery within 5km
    },
    
    // Weight-based delivery (future enhancement)
    perKgRate: {
      type: Number,
      default: 10
    },
    freeWeightLimit: {
      type: Number,
      default: 50 // Free delivery under 50kg
    }
  },
  
  // Display Configuration
  priceDisplayMode: {
    type: String,
    enum: ['admin', 'merchant', 'lowest'], // admin: show admin price, merchant: show merchant price, lowest: show lowest available price
    default: 'admin'
  },
  
  // Stock Configuration
  stockValidationMode: {
    type: String,
    enum: ['admin', 'merchant'], // admin: validate against total stock, merchant: validate against merchant stock
    default: 'admin'
  },
  
  // Auto stock reduction on delivery
  autoReduceStockOnDelivery: {
    type: Boolean,
    default: true
  },
  
  // Platform fees (future enhancement)
  platformFeeRate: {
    type: Number,
    default: 0.02, // 2% platform fee
    min: 0,
    max: 0.1
  },
  
  // Minimum order value
  minimumOrderValue: {
    type: Number,
    default: 100
  },
  
  // Updated timestamp
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Ensure only one settings document exists
AppSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

AppSettingsSchema.statics.updateSettings = async function(updates, updatedBy) {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this(updates);
  } else {
    Object.assign(settings, updates);
  }
  settings.updatedBy = updatedBy;
  settings.updatedAt = new Date();
  await settings.save();
  return settings;
};

module.exports = mongoose.model('AppSettings', AppSettingsSchema);