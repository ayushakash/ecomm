const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const merchantSchema = new mongoose.Schema({
  // Basic User fields (similar to User schema)
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    unique: true,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
  },
  role: {
    type: String,
    default: 'merchant'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // OTP-related fields (same as User)
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String
  },

  // Merchant-specific fields
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  contactPersonName: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
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
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
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
  },
  // Location and GPS coordinates
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  // Merchant availability and capacity
  availability: {
    isActive: { type: Boolean, default: true },
    maxDailyOrders: { type: Number, default: 10 },
    currentDayOrders: { type: Number, default: 0 },
    lastOrderAt: Date,
    workingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "18:00" },
      days: { type: [String], default: ["mon", "tue", "wed", "thu", "fri", "sat"] }
    }
  }
}, {
  timestamps: true
});

// Hash password before saving (same as User schema)
merchantSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method (same as User schema)
merchantSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and save OTP (same as User schema)
merchantSchema.methods.generateOTP = function() {
  this.otp = '1234'; // For demo purposes
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return this.otp;
};

// Verify OTP (same as User schema)
merchantSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otpExpiry) return false;
  if (this.otpExpiry < new Date()) return false;
  return this.otp === candidateOTP;
};

// Clear OTP after verification (same as User schema)
merchantSchema.methods.clearOTP = function() {
  this.otp = undefined;
  this.otpExpiry = undefined;
};

// Remove sensitive data from JSON response (same as User schema)
merchantSchema.methods.toJSON = function() {
  const merchant = this.toObject();
  delete merchant.password;
  delete merchant.refreshToken;
  delete merchant.otp;
  delete merchant.otpExpiry;
  return merchant;
};

// Index for area-based queries
merchantSchema.index({ area: 1, activeStatus: 1 });

// Index for geospatial queries
merchantSchema.index({ location: '2dsphere' });

// Index for availability queries
merchantSchema.index({ 'availability.isActive': 1, 'availability.currentDayOrders': 1 });

// Index for phone-based queries (for login)
merchantSchema.index({ phone: 1 });

// Create sparse unique index for email (allows multiple null/undefined values)
merchantSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Merchant', merchantSchema);
