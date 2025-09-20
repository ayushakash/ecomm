const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Address title is required'],
    trim: true,
    maxlength: [50, 'Address title cannot exceed 50 characters']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  addressLine1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true,
    maxlength: [200, 'Address line 1 cannot exceed 200 characters']
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: [200, 'Address line 2 cannot exceed 200 characters']
  },
  landmark: {
    type: String,
    trim: true,
    maxlength: [100, 'Landmark cannot exceed 100 characters']
  },
  area: {
    type: String,
    required: [true, 'Area is required'],
    trim: true,
    maxlength: [100, 'Area cannot exceed 100 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [50, 'City cannot exceed 50 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
  },
  coordinates: {
    latitude: {
      type: Number,
      validate: {
        validator: function(v) {
          return v === null || v === undefined || (v >= -90 && v <= 90);
        },
        message: 'Latitude must be between -90 and 90'
      }
    },
    longitude: {
      type: Number,
      validate: {
        validator: function(v) {
          return v === null || v === undefined || (v >= -180 && v <= 180);
        },
        message: 'Longitude must be between -180 and 180'
      }
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  addressType: {
    type: String,
    enum: ['home', 'office', 'other'],
    default: 'home'
  },
  deliveryInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Delivery instructions cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, isActive: 1 });

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default flag from other addresses of the same user
    await mongoose.model('Address').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Virtual for full address string
addressSchema.virtual('fullAddress').get(function() {
  let address = this.addressLine1;
  if (this.addressLine2) address += ', ' + this.addressLine2;
  if (this.landmark) address += ', ' + this.landmark;
  address += ', ' + this.area + ', ' + this.city + ', ' + this.state + ' - ' + this.pincode;
  return address;
});

// Ensure virtuals are included in JSON output
addressSchema.set('toJSON', { virtuals: true });
addressSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Address', addressSchema);