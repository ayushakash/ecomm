const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const { verifyToken } = require('../middleware/auth');
const mongoose = require('mongoose');

// @desc    Get all addresses for a user
// @route   GET /api/addresses
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const addresses = await Address.find({ 
      user: req.user._id,
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching addresses'
    });
  }
});

// @desc    Get a single address by ID
// @route   GET /api/addresses/:id
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: req.user._id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching address'
    });
  }
});

// @desc    Create a new address
// @route   POST /api/addresses
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      state,
      pincode,
      coordinates,
      isDefault,
      addressType,
      deliveryInstructions
    } = req.body;

    // Create new address
    const address = new Address({
      user: req.user._id,
      title,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      state,
      pincode,
      coordinates,
      isDefault: isDefault || false,
      addressType,
      deliveryInstructions
    });

    // If this is the user's first address, make it default
    const addressCount = await Address.countDocuments({ 
      user: req.user._id, 
      isActive: true 
    });
    
    if (addressCount === 0) {
      address.isDefault = true;
    }

    await address.save();

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });
  } catch (error) {
    console.error('Create address error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating address'
    });
  }
});

// @desc    Update an address
// @route   PUT /api/addresses/:id
// @access  Private
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    const {
      title,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      state,
      pincode,
      coordinates,
      isDefault,
      addressType,
      deliveryInstructions
    } = req.body;

    const updateData = {
      title,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      state,
      pincode,
      coordinates,
      addressType,
      deliveryInstructions
    };

    // Handle default address logic
    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;
    }

    const address = await Address.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
        isActive: true
      },
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    console.error('Update address error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating address'
    });
  }
});

// @desc    Set an address as default
// @route   PUT /api/addresses/:id/default
// @access  Private
router.put('/:id/default', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    // Check if address exists and belongs to user
    const address = await Address.findOne({
      _id: id,
      user: req.user._id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update the address to be default (pre-save middleware will handle removing default from others)
    address.isDefault = true;
    await address.save();

    res.json({
      success: true,
      message: 'Default address updated successfully',
      data: address
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting default address'
    });
  }
});

// @desc    Delete an address (soft delete)
// @route   DELETE /api/addresses/:id
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: req.user._id,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Soft delete
    address.isActive = false;
    await address.save();

    // If this was the default address, make another one default
    if (address.isDefault) {
      const newDefaultAddress = await Address.findOne({
        user: req.user._id,
        isActive: true,
        _id: { $ne: id }
      }).sort({ createdAt: -1 });

      if (newDefaultAddress) {
        newDefaultAddress.isDefault = true;
        await newDefaultAddress.save();
      }
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting address'
    });
  }
});

// @desc    Get default address for a user
// @route   GET /api/addresses/default
// @access  Private
router.get('/default/get', verifyToken, async (req, res) => {
  try {
    const defaultAddress = await Address.findOne({
      user: req.user._id,
      isDefault: true,
      isActive: true
    });

    if (!defaultAddress) {
      return res.status(404).json({
        success: false,
        message: 'No default address found'
      });
    }

    res.json({
      success: true,
      data: defaultAddress
    });
  } catch (error) {
    console.error('Get default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching default address'
    });
  }
});

module.exports = router;