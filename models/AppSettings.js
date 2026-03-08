const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  // GST Configuration (Application-wide)
  gstEnabled: {
    type: Boolean,
    default: true, // Enable GST by default
    required: true
  },

  // Pricing Configuration
  taxRate: {
    type: Number,
    default: 0.18, // 18% GST (DEPRECATED - use per-product gstRate instead)
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
    },

    // Location-based delivery filtering
    maxDeliveryRadius: {
      type: Number,
      default: 10 // Primary delivery radius in km
    },
    maxExpandedRadius: {
      type: Number,
      default: 25 // Maximum expanded radius for sparse areas in km
    },
    minimumMerchantsBeforeExpand: {
      type: Number,
      default: 3 // Expand search if fewer merchants found
    },
    fallbackStrategy: {
      type: String,
      enum: ['expand', 'city-wide', 'none'],
      default: 'expand' // expand: expand radius, city-wide: show all city merchants, none: show no products
    },
    enablePincodeGrouping: {
      type: Boolean,
      default: true // Group nearby pincodes as same delivery zone
    }
  },
  
  // Display Configuration
  priceDisplayMode: {
    type: String,
    enum: ['admin', 'merchant', 'lowest'], // admin: show admin price, merchant: show merchant price, lowest: show lowest available price
    default: 'admin'
  },

  // GST Display Configuration (platform-wide)
  gstDisplayMode: {
    type: String,
    enum: ['inclusive', 'exclusive', 'no-display'], // inclusive: prices include GST, exclusive: GST added at checkout, no-display: show base price without GST
    default: 'exclusive'
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

  // Bulk order WhatsApp number (with country code) — shown publicly on product pages
  bulkOrderPhone: {
    type: String,
    default: ''
  },


  // GST Mode Configuration
  gstMode: {
    type: String,
    enum: ['no-gst', 'inclusive', 'exclusive'],
    default: 'no-gst',
    required: true
  },

  // Enable split GST calculation between merchant and platform
  splitGSTEnabled: {
    type: Boolean,
    default: true
  },

  // Delivery fee revenue sharing between merchant and platform
  deliveryFeeSplit: {
    merchantPercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    platformPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Apply GST on platform fee (service tax)
  applyGSTOnPlatformFee: {
    type: Boolean,
    default: true
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