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
   rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Merchant" }]
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
  items: [orderItemSchema], // 👈 each item has its own merchant assignment
  subtotal: {
    type: Number,
    required: true,
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
      userEmail: String
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

module.exports = mongoose.model('Order', orderSchema);
