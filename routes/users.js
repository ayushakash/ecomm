const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Address = require('../models/Address');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin only)
router.get('/', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { role, area, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (area) filter.area = { $regex: area, $options: 'i' };

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    const total = await User.countDocuments(filter);

    // Attach each user's default saved address (from the separate Address collection)
    const userIds = users.map((u) => u._id);
    const addresses = await Address.find({
      user: { $in: userIds },
      isActive: true
    })
      .sort({ isDefault: -1, createdAt: 1 })
      .lean()
      .exec();

    const addressByUser = {};
    for (const addr of addresses) {
      // First match wins (default sorted first, then oldest)
      if (!addressByUser[addr.user]) {
        addressByUser[addr.user] = addr;
      }
    }

    const usersWithAddress = users.map((u) => ({
      ...u,
      defaultAddress: addressByUser[u._id] || null
    }));

    res.json({
      users: usersWithAddress,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', verifyToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
  verifyToken,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('address').optional().trim(),
  body('area').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Invalid email format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, address, area, email } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (area) updateData.area = area;
    if (email) updateData.email = email;

    // Use findByIdAndUpdate to avoid issues with password validation
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      {
        new: true, // Return the updated document
        runValidators: true, // Run model validators
        select: '-password -refreshToken -otp -otpExpiry' // Exclude sensitive fields
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field === 'phone' ? 'Phone number' : field} already exists`
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (Admin only)
// @access  Private (Admin only)
router.put('/:id/status', [
  verifyToken,
  requireAdmin,
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private (Admin only)
router.put('/:id/role', [
  verifyToken,
  requireAdmin,
  body('role').isIn(['customer', 'merchant', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/areas
// @desc    Get all unique areas
// @access  Public
router.get('/areas', async (req, res) => {
  try {
    const areas = await User.distinct('area');
    res.json({ areas: areas.filter(area => area).sort() });
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
