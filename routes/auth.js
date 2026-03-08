const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Merchant = require('../models/Merchant');
const OTP = require('../models/OTP');
const { verifyToken } = require('../middleware/auth');
const MSG91Service = require('../services/MSG91Service');
const EmailService = require('../services/EmailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Helper function to generate OTP
const generateOTPCode = () => {
  const useRealOTP = process.env.MSG91_OTP_ENABLED === 'true';
  if (useRealOTP) {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  return '1234';
};

// Helper function to get OTP expiry time
const getOTPExpiry = () => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

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
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('purpose').optional().isIn(['login', 'registration']).withMessage('Invalid purpose')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, purpose = 'login' } = req.body;

    // Check if user exists with this phone number
    let user = await User.findOne({ phone });
    let merchant = await Merchant.findOne({ phone });

    // Generate OTP
    let otp;
    let userExists = false;
    let userRole = null;

    if (!user && !merchant) {
      // No user or merchant exists, generate OTP for registration
      otp = generateOTPCode();
      userExists = false;

      // Store OTP in OTP model for registration verification
      await OTP.findOneAndDelete({ phone, purpose: 'registration', isUsed: false });
      await OTP.create({
        phone,
        otp,
        purpose: 'registration',
        sentVia: 'whatsapp',
        expiresAt: getOTPExpiry(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

    } else if (user) {
      // User exists, generate and save OTP
      otp = user.generateOTP();
      await user.save();
      userExists = true;
      userRole = user.role;
    } else if (merchant) {
      // Merchant exists, generate and save OTP
      otp = merchant.generateOTP();
      await merchant.save();
      userExists = true;
      userRole = 'merchant';
    }

    // Send OTP via MSG91 WhatsApp
    const sendResult = await MSG91Service.sendOTP(phone, otp, purpose);

    if (!sendResult.success && sendResult.channel !== 'mock') {
      console.warn('⚠️ MSG91 OTP send failed:', sendResult.error);
    }

    // In development, return OTP for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const otpDisabled = process.env.MSG91_OTP_ENABLED !== 'true';

    return res.json({
      message: 'OTP sent successfully to your WhatsApp',
      userExists,
      userRole,
      phone,
      channel: sendResult.channel || 'whatsapp',
      // Only include OTP in development OR when OTP service is disabled
      ...((isDevelopment || otpDisabled) && { otp: otp })
    });

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
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
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
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
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
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
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

    // Find and verify OTP from OTP model
    const otpRecord = await OTP.findOne({
      phone,
      purpose: 'registration',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    // Check max attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        message: 'Invalid OTP. Please try again.',
        attemptsRemaining: 3 - otpRecord.attempts
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Create new user with phone as primary identifier
    const user = new User({
      name,
      phone,
      email: undefined,
      password: 'temp123456',
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
  body('contactEmail').trim().notEmpty().withMessage('Email address is required').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
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
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
], async (req, res) => {
  try {
    console.log('📥 Received merchant registration request:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactName, contactPhone, contactEmail, name, businessType, gstNumber, panNumber, address, area, city, state, pincode, latitude, longitude, otp } = req.body;

    // Check if merchant already exists with this phone number
    const existingMerchant = await Merchant.findOne({ phone: contactPhone });
    if (existingMerchant) {
      return res.status(400).json({ message: 'Merchant already exists with this phone number' });
    }

    // Find and verify OTP from OTP model
    const otpRecord = await OTP.findOne({
      phone: contactPhone,
      purpose: 'registration',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    // Check max attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        message: 'Invalid OTP. Please try again.',
        attemptsRemaining: 3 - otpRecord.attempts
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Create new merchant directly (no separate User model needed)
    const merchant = new Merchant({
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      password: 'temp123456',
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
      activeStatus: 'pending'
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

// @route   POST /api/auth/google
// @desc    Login or register via Google OAuth
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link googleId if signing in via Google for first time on existing email account
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save();
      }
    } else {
      // Create new user (no phone yet — will be required at checkout)
      user = new User({
        name,
        email,
        googleId,
        authProvider: 'google',
        password: 'google-oauth-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        isPhoneVerified: false
      });
      await user.save();
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    return res.json({
      message: 'Google login successful',
      user: user.toJSON(),
      accessToken,
      refreshToken,
      phoneRequired: !user.phone
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Invalid Google credential' });
  }
});

// @route   POST /api/auth/link-phone/send-otp
// @desc    Send OTP to link a phone number to a Google account
// @access  Private
router.post('/link-phone/send-otp', verifyToken, [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    const currentUser = req.user;

    // Ensure this phone isn't already used by another account
    const existing = await User.findOne({ phone, _id: { $ne: currentUser._id } });
    if (existing) {
      return res.status(400).json({ message: 'This phone number is already linked to another account' });
    }

    const otp = generateOTPCode();

    // Delete any existing unused OTP for this phone+purpose
    await OTP.findOneAndDelete({ phone, purpose: 'phone_link', isUsed: false });

    await OTP.create({
      phone,
      otp,
      purpose: 'phone_link',
      sentVia: 'whatsapp',
      expiresAt: getOTPExpiry(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const sendResult = await MSG91Service.sendOTP(phone, otp, 'phone_link');
    if (!sendResult.success && sendResult.channel !== 'mock') {
      console.warn('MSG91 OTP send failed:', sendResult.error);
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const otpDisabled = process.env.MSG91_OTP_ENABLED !== 'true';

    return res.json({
      message: 'OTP sent to your WhatsApp',
      ...((isDevelopment || otpDisabled) && { otp })
    });
  } catch (error) {
    console.error('Link phone send-otp error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/link-phone/verify
// @desc    Verify OTP and link phone number to logged-in user
// @access  Private
router.post('/link-phone/verify', verifyToken, [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;
    const currentUser = req.user;

    const otpRecord = await OTP.findOne({
      phone,
      purpose: 'phone_link',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        message: 'Invalid OTP. Please try again.',
        attemptsRemaining: 3 - otpRecord.attempts
      });
    }

    // Mark OTP used
    otpRecord.isUsed = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Link phone to user
    currentUser.phone = phone;
    currentUser.isPhoneVerified = true;
    await currentUser.save();

    return res.json({
      message: 'Phone number verified and linked successfully',
      user: currentUser.toJSON()
    });
  } catch (error) {
    console.error('Link phone verify error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/change-email/send-otp
// @desc    Send OTP to a new email address to verify before updating
// @access  Private
router.post('/change-email/send-otp', verifyToken, [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const currentUser = req.user;

    // Don't allow setting to the same email
    if (currentUser.email && currentUser.email === email) {
      return res.status(400).json({ message: 'This is already your current email address' });
    }

    // Check if email is already used by another account
    const existing = await User.findOne({ email, _id: { $ne: currentUser._id } });
    if (existing) {
      return res.status(400).json({ message: 'This email is already linked to another account' });
    }

    // Email OTPs always use a real random code regardless of MSG91 flag
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing unused OTP for this email+purpose
    await OTP.findOneAndDelete({ email, purpose: 'email_change', isUsed: false });

    await OTP.create({
      email,
      otp,
      purpose: 'email_change',
      sentVia: 'email',
      userId: currentUser._id,
      expiresAt: getOTPExpiry(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const sendResult = await EmailService.sendOTP(email, otp, 'email_change');
    if (!sendResult.success && sendResult.channel !== 'mock') {
      console.warn('EmailService send failed:', sendResult.error);
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const smtpDisabled = !process.env.SMTP_USER || !process.env.SMTP_PASS;

    return res.json({
      message: 'Verification code sent to your new email address',
      ...((isDevelopment || smtpDisabled) && { otp })
    });
  } catch (error) {
    console.error('Change email send-otp error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/change-email/verify
// @desc    Verify OTP and update the user's email address
// @access  Private
router.post('/change-email/verify', verifyToken, [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    const currentUser = req.user;

    const otpRecord = await OTP.findOne({
      email,
      purpose: 'email_change',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new code.' });
    }

    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        message: 'Invalid code. Please try again.',
        attemptsRemaining: 3 - otpRecord.attempts
      });
    }

    // Mark OTP used
    otpRecord.isUsed = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Update user's email
    currentUser.email = email;
    await currentUser.save();

    return res.json({
      message: 'Email updated successfully',
      user: currentUser.toJSON()
    });
  } catch (error) {
    console.error('Change email verify error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
