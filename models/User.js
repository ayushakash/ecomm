const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true, // Allow multiple null values
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['customer', 'merchant', 'admin'],
    default: 'customer'
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // OTP-related fields
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
}, {
  timestamps: true
});

// Create sparse unique index for email (allows multiple null/undefined values)
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and save OTP
userSchema.methods.generateOTP = function() {
  // For demo purposes, always use 1234. In production, use: Math.floor(1000 + Math.random() * 9000).toString()
  this.otp = '1234';
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return this.otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otpExpiry) return false;
  if (this.otpExpiry < new Date()) return false; // OTP expired
  return this.otp === candidateOTP;
};

// Clear OTP after verification
userSchema.methods.clearOTP = function() {
  this.otp = undefined;
  this.otpExpiry = undefined;
};

// Remove sensitive data from JSON response
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.otp;
  delete user.otpExpiry;
  return user;
};

module.exports = mongoose.model('User', userSchema);
