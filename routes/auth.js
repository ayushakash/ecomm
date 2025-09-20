const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Merchant = require('../models/Merchant');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// @route   POST /api/auth/send-otp
// @desc    Send OTP to mobile number for login/registration
// @access  Public
router.post('/send-otp', [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;

    // Check if user exists with this phone number
    let user = await User.findOne({ phone });
    let merchant = await Merchant.findOne({ phone });

    if (!user && !merchant) {
      // No user or merchant exists, will need to register
      return res.json({
        message: 'OTP sent successfully',
        userExists: false,
        phone,
        otp: '1234' // For demo purposes, sending OTP in response
      });
    }

    if (user) {
      // User exists, generate and save OTP
      const otp = user.generateOTP();
      await user.save();

      return res.json({
        message: 'OTP sent successfully',
        userExists: true,
        userRole: user.role,
        phone,
        otp: otp // For demo purposes only
      });
    }

    if (merchant) {
      // Merchant exists, generate and save OTP
      const otp = merchant.generateOTP();
      await merchant.save();

      return res.json({
        message: 'OTP sent successfully',
        userExists: true,
        userRole: 'merchant',
        phone,
        otp: otp // For demo purposes only
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-otp-phone
// @desc    Verify OTP for phone verification only (step 1 of admin 2FA)
// @access  Public
router.post('/verify-otp-phone', [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'User not found. Please register first.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Verify OTP
    const isOTPValid = user.verifyOTP(otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP and mark phone as verified
    user.clearOTP();
    user.isPhoneVerified = true;
    await user.save();

    // Return user info without tokens (phone verification only)
    res.json({
      message: 'Phone verification successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPhoneVerified: true
      }
    });

  } catch (error) {
    console.error('OTP phone verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-otp-login
// @desc    Verify OTP and login existing user or merchant
// @access  Public
router.post('/verify-otp-login', [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;

    // Find user or merchant by phone
    const user = await User.findOne({ phone });
    const merchant = await Merchant.findOne({ phone });

    if (!user && !merchant) {
      return res.status(400).json({ message: 'User not found. Please register first.' });
    }

    // Handle merchant login
    if (merchant) {
      // Check if merchant is active
      if (!merchant.isActive) {
        return res.status(400).json({ message: 'Account is deactivated' });
      }

      // Verify OTP
      const isOTPValid = merchant.verifyOTP(otp);
      if (!isOTPValid) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Clear OTP and mark phone as verified
      merchant.clearOTP();
      merchant.isPhoneVerified = true;
      await merchant.save();

      // Check approval status
      if (merchant.activeStatus !== 'approved') {
        return res.status(403).json({
          message: `Your merchant account is ${merchant.activeStatus}. Please wait for admin approval.`,
          status: merchant.activeStatus,
          canLogin: false
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(merchant._id);

      // Save refresh token to merchant
      merchant.refreshToken = refreshToken;
      await merchant.save();

      return res.json({
        message: 'Login successful',
        user: merchant.toJSON(),
        merchantStatus: merchant.activeStatus,
        accessToken,
        refreshToken
      });
    }

    // Handle regular user login
    if (user) {
      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({ message: 'Account is deactivated' });
      }

      // Verify OTP
      const isOTPValid = user.verifyOTP(otp);
      if (!isOTPValid) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Clear OTP and mark phone as verified
      user.clearOTP();
      user.isPhoneVerified = true;
      await user.save();

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Save refresh token to user
      user.refreshToken = refreshToken;
      await user.save();

      return res.json({
        message: 'Login successful',
        user: user.toJSON(),
        merchantStatus: null,
        accessToken,
        refreshToken
      });
    }

  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-otp-register
// @desc    Verify OTP and register new user
// @access  Public
router.post('/verify-otp-register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, otp } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // For demo purposes, verify static OTP
    if (otp !== '1234') {
      return res.status(400).json({ message: 'Invalid OTP. Please enter 1234' });
    }

    // Create new user with phone as primary identifier
    const user = new User({
      name,
      phone,
      email: undefined, // Don't set temporary email, leave as undefined
      password: 'temp123456', // Temporary password, can be updated later
      role: 'customer',
      isPhoneVerified: true
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('OTP registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (legacy email-based)
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('role').optional().isIn(['customer', 'merchant', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, role = 'customer' } = req.body;

    // Check if user already exists by email (if email provided)
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
    }

    // Check if phone is provided and already exists
    if (phone) {
      const existingPhoneUser = await User.findOne({ phone });
      if (existingPhoneUser) {
        return res.status(400).json({ message: 'User already exists with this phone number' });
      }
    }

    // Create new user - set email to undefined if empty string to avoid null issues
    const user = new User({
      name,
      email: email || undefined, // Use undefined instead of empty string to avoid null issues
      password,
      phone,
      role
    });

    await user.save();

    // Note: Merchant registration will be handled by separate endpoint with complete form

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // For merchants, check approval status
    let merchantStatus = null;
    if (user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: user._id });
      if (merchant) {
        merchantStatus = merchant.activeStatus;
        if (merchantStatus !== 'approved') {
          return res.status(403).json({ 
            message: `Your merchant account is ${merchantStatus}. Please wait for admin approval.`,
            status: merchantStatus,
            canLogin: false
          });
        }
      } else {
        return res.status(404).json({ 
          message: 'Merchant profile not found. Please contact support.',
          canLogin: false
        });
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      merchantStatus,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key');
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Clear refresh token
    req.user.refreshToken = null;
    await req.user.save();

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/register-merchant
// @desc    Register a new merchant with complete business details
// @access  Public
router.post('/register-merchant', [
  body('contactName').trim().isLength({ min: 2 }).withMessage('Contact name must be at least 2 characters'),
  body('contactPhone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('contactEmail').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('name').trim().isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
  body('businessType').notEmpty().withMessage('Business type is required'),
  body('gstNumber').optional().trim(),
  body('panNumber').optional().trim(),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('area').trim().notEmpty().withMessage('Area is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').matches(/^\d{6}$/).withMessage('Please enter a valid 6-digit pincode'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactName, contactPhone, contactEmail, name, businessType, gstNumber, panNumber, address, area, city, state, pincode, latitude, longitude, otp } = req.body;

    // Verify OTP (for demo purposes)
    if (otp !== '1234') {
      return res.status(400).json({ message: 'Invalid OTP. Please enter 1234' });
    }

    // Check if merchant already exists with this phone number
    const existingMerchant = await Merchant.findOne({ phone: contactPhone });
    if (existingMerchant) {
      return res.status(400).json({ message: 'Merchant already exists with this phone number' });
    }

    // Create new merchant directly (no separate User model needed)
    const merchant = new Merchant({
      name: contactName,
      phone: contactPhone,
      email: contactEmail || undefined, // Use undefined instead of empty string
      password: 'temp123456', // Temporary password
      isPhoneVerified: true,

      // Merchant-specific fields
      businessName: name,
      contactPersonName: contactName,
      area: area,
      address: address,
      city: city,
      state: state,
      pincode: pincode,
      businessType: businessType,
      documents: {
        gstNumber: gstNumber || '',
        panNumber: panNumber || ''
      },
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      activeStatus: 'pending' // Will need admin approval
    });

    await merchant.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(merchant._id);

    // Save refresh token to merchant
    merchant.refreshToken = refreshToken;
    await merchant.save();

    res.status(201).json({
      message: 'Merchant registration successful. Your account is pending admin approval.',
      user: merchant.toJSON(),
      merchant: {
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        activeStatus: merchant.activeStatus
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Merchant registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
