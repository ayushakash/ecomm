const express = require('express');
const { body, validationResult } = require('express-validator');
const Merchant = require('../models/Merchant');
const User = require('../models/User');
const { verifyToken, requireAdmin, requireMerchant, requireApprovedMerchant } = require('../middleware/auth');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const router = express.Router();

// @route   POST /api/merchants/onboard
// @desc    Onboard a new merchant (legacy route - prefer /api/auth/register-merchant)
// @access  Private (Admin only)
router.post('/onboard', [
  verifyToken,
  requireAdmin,
  body('name').trim().isLength({ min: 2 }).withMessage('Contact name must be at least 2 characters'),
  body('businessName').trim().isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('area').trim().notEmpty().withMessage('Area is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('businessType').trim().notEmpty().withMessage('Business type is required'),
  body('documents.gstNumber').optional().trim(),
  body('documents.panNumber').optional().trim(),
  body('documents.businessLicense').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      businessName,
      phone,
      email,
      area,
      address,
      city,
      state,
      pincode,
      businessType,
      documents,
      latitude,
      longitude
    } = req.body;

    // Check if merchant already exists with this phone
    const existingMerchant = await Merchant.findOne({ phone });
    if (existingMerchant) {
      return res.status(400).json({ message: 'Merchant already exists with this phone number' });
    }

    // Create new merchant using unified schema
    const merchant = new Merchant({
      name,
      businessName,
      contactPersonName: name,
      phone,
      email: email || undefined,
      password: 'temp123456',
      role: 'merchant',
      isPhoneVerified: true,
      area,
      address,
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      businessType,
      documents: documents || {},
      location: {
        type: 'Point',
        coordinates: [longitude || 0, latitude || 0]
      },
      activeStatus: 'approved' // Admin is directly onboarding, so approve
    });

    await merchant.save();

    res.status(201).json({
      message: 'Merchant onboarded successfully',
      merchant
    });
  } catch (error) {
    console.error('Merchant onboarding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/merchants
// @desc    Get all merchants with filtering
// @access  Private (Admin only)
router.get('/', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { area, status, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (area) filter.area = { $regex: area, $options: 'i' };
    if (status) filter.activeStatus = status;

    const merchants = await Merchant.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Merchant.countDocuments(filter);

    res.json({
      merchants,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get merchants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/merchants/area/:area
// @desc    Get merchants by area (public)
// @access  Public
router.get('/area/:area', async (req, res) => {
  try {
    const { area } = req.params;
    
    const merchants = await Merchant.find({
      area: { $regex: area, $options: 'i' },
      activeStatus: 'approved'
    });

    res.json({ merchants });
  } catch (error) {
    console.error('Get merchants by area error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/merchants/:id
// @desc    Get merchant by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    res.json({ merchant });
  } catch (error) {
    console.error('Get merchant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/merchants/:id/status
// @desc    Update merchant status
// @access  Private (Admin only)
router.put('/:id/status', [
  verifyToken,
  requireAdmin,
  body('activeStatus').isIn(['pending', 'approved', 'rejected', 'suspended']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { activeStatus } = req.body;
    const { id } = req.params;

    const merchant = await Merchant.findById(id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    merchant.activeStatus = activeStatus;
    await merchant.save();

    res.json({
      message: 'Merchant status updated successfully',
      merchant
    });
  } catch (error) {
    console.error('Update merchant status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/merchants/profile
// @desc    Update merchant profile (merchant only)
// @access  Private (Merchant only)
router.put('/profile', [
  verifyToken,
  requireMerchant,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
  body('businessType').optional().trim().notEmpty().withMessage('Business type cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'email', 'address', 'businessType', 'businessName'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        merchant[field] = req.body[field];
      }
    });

    await merchant.save();

    res.json({
      message: 'Profile updated successfully',
      merchant
    });
  } catch (error) {
    console.error('Update merchant profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/merchants/profile/me
// @desc    Get current merchant profile
// @access  Private (Merchant only)
router.get('/profile/me', [verifyToken, requireMerchant], async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    res.json({ merchant });
  } catch (error) {
    console.error('Get merchant profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId)
      .populate('merchantId', 'name contact area activeStatus');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only approved merchants
    const merchants = product.merchantId && product.merchantId.activeStatus === 'approved'
      ? [product.merchantId]
      : [];

    res.json(merchants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
