const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // Merchant pricing (base cost)
  merchantUnitPrice: {
    type: Number,
    min: 0
  },
  merchantTotalPrice: {
    type: Number,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  assignedMerchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant'
  },
  assignedMerchantName: {
    type: String
  },
  sku: {
    type: String
  },
  weight: {
    type: Number,
    default: 0
  },
  itemStatus: {
    type: String,
   enum: ['pending', 'approved', 'assigned', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
   rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Merchant" }],
  variantLabel: {
    type: String,
    default: null
  },
  gstRate: {
    type: Number,
    default: 0
  },
  gstType: {
    type: String,
    default: 'exclusive'
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
    // required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  customerArea: {
    type: String,
    required: true
  },
  deliveryAddressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  // Delivery location with GPS coordinates
  deliveryLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    address: String,
    area: String,
    pincode: String,
    city: String,
    state: String,
    isCurrentLocation: { type: Boolean, default: false },
    receiverName: String, // Name of the person receiving the delivery
    receiverPhone: String // Phone number of the receiver
  },
  items: [orderItemSchema], // 👈 each item has its own merchant assignment
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  subtotalBeforeGST: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  pricingBreakdown: {
    taxRate: Number,
    deliveryConfig: Object,
    minimumOrderValue: Number
  },
  // GST split breakdown between merchant and platform
  gstBreakdown: {
    mode: {
      type: String,
      enum: ['no-gst', 'inclusive', 'exclusive'],
      default: 'no-gst'
    },
    merchantGST: {
      type: Number,
      default: 0
    },
    platformGST: {
      type: Number,
      default: 0
    },
    totalGST: {
      type: Number,
      default: 0
    },
    isDummyGST: {
      type: Boolean,
      default: false
    },
    platformFeeGST: {
      type: Number,
      default: 0
    }
  },
  // Delivery fee split between merchant and platform
  deliverySplit: {
    merchantShare: {
      type: Number,
      default: 0
    },
    platformShare: {
      type: Number,
      default: 0
    }
  },
  orderStatus: {
    type: String,
   enum: ['pending', 'approved', 'assigned', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  requireGSTBill: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online', 'bank-transfer'],
    default: 'cod'
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true
    }
  }],
  // Complete lifecycle tracking (replaces separate OrderLog)
  lifecycle: [{
    eventType: {
      type: String,
      enum: ['order_created', 'order_assigned', 'order_accepted', 'order_rejected', 
             'order_shipped', 'order_delivered', 'order_cancelled', 'payment_confirmed', 
             'payment_failed', 'stock_updated', 'refund_initiated', 'refund_completed'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    triggeredBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userType: { type: String, enum: ['customer', 'merchant', 'admin', 'system'] },
      userName: String,
      userEmail: String,
      userPhone: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    notificationSent: {
      n8n: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        response: mongoose.Schema.Types.Mixed,
        error: String
      }
    },
    eventDescription: String
  }],
  // Merchant payout tracking for multi-merchant orders (single source of truth)
  merchantPayouts: [{
    // Merchant identification
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true
    },
    merchantName: String,

    // Item values
    itemsCount: Number,
    itemsBaseValue: Number,        // Merchant's cost price
    itemsCustomerValue: Number,    // What customer pays for items

    // GST breakdown (split GST between merchant and platform)
    merchantGSTShare: { type: Number, default: 0 },    // Merchant's GST share (merchant remits to govt)
    platformGSTShare: { type: Number, default: 0 },    // Platform's GST share (platform remits to govt)

    // Revenue shares
    deliveryShare: Number,                             // Merchant's share of delivery fee
    platformDeliveryShare: { type: Number, default: 0 }, // Platform's share of delivery fee
    platformFeeShare: Number,                          // Merchant's share of platform fee
    platformCommission: Number,                        // Platform's markup (price - cost, GST excluded)

    // GST metadata
    gstMode: {
      type: String,
      enum: ['no-gst', 'inclusive', 'exclusive']
    },
    isDummyGST: { type: Boolean, default: false },     // True if GST is for display only (no-gst mode)

    // Settlement amounts (complete calculations stored for single source of truth)
    codCollectionAmount: Number,                       // Total COD merchant collects from customer
    amountOwePlatform: Number,                         // Total merchant owes to platform (commission + GST + fees)
    netPayout: Number,                                 // Final merchant payout (base + GST - platform dues)

    // Metadata
    merchantSharePercent: Number,                      // % of order this merchant handles (for multi-merchant orders)
    calculatedAt: { type: Date, default: Date.now },  // When payout was calculated

    // Settlement tracking
    settlementStatus: {
      type: String,
      enum: ['pending', 'processing', 'settled', 'failed'],
      default: 'pending'
    },
    settlementDate: Date,
    settlementNotes: String
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get count of orders for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    this.orderNumber = `ORD${year}${month}${day}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

orderSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    const statuses = this.items.map(i => i.itemStatus);

    if (statuses.every(s => s === "delivered")) this.orderStatus = "delivered";
    else if (statuses.every(s => s === "cancelled")) this.orderStatus = "cancelled";
    else if (statuses.some(s => s === "processing" || s === "assigned")) this.orderStatus = "processing";
    else if (statuses.some(s => s === "pending")) this.orderStatus = "pending";
    else if (statuses.some(s => s === "shipped")) this.orderStatus = "shipped";
    else this.orderStatus = "approved"; // fallback
  }
  next();
});

// Add status to history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date()
    });
  }
  next();
});

// Indexes for efficient queries
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ 'items.assignedMerchantId': 1, orderStatus: 1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

// Index for geospatial queries
orderSchema.index({ deliveryLocation: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);
