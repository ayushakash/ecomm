const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const CityMaster = require('../models/CityMaster');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/cities
 * Get all cities (public or filtered)
 */
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const cities = await CityMaster.find(filter)
      .sort({ displayOrder: 1, cityName: 1 });

    res.json({
      success: true,
      cities,
      count: cities.length
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/cities/available
 * Get cities that have active merchants (for calculator dropdown)
 */
router.get('/available', async (req, res) => {
  try {
    const cities = await CityMaster.find({ isActive: true })
      .sort({ displayOrder: 1, cityName: 1 })
      .select('cityName state');

    res.json({
      success: true,
      cities: cities.map(c => ({
        _id: c._id,
        city: c.cityName,
        state: c.state
      }))
    });
  } catch (error) {
    console.error('Get available cities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/cities/:id
 * Get single city by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const city = await CityMaster.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    res.json({
      success: true,
      city
    });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/cities
 * Create new city (Admin only)
 */
router.post('/', [
  verifyToken,
  requireAdmin,
  body('cityName').trim().notEmpty().withMessage('City name is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('isActive').optional().isBoolean(),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('region').optional().isIn(['North', 'South', 'East', 'West', 'Central', 'Northeast'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cityName, state, isActive, displayOrder, region, pincode, defaultDeliveryCharge, deliveryRadius } = req.body;

    // Check if city already exists
    const existingCity = await CityMaster.findOne({
      cityName: { $regex: new RegExp(`^${cityName}$`, 'i') },
      state: { $regex: new RegExp(`^${state}$`, 'i') }
    });

    if (existingCity) {
      return res.status(400).json({ message: 'City already exists in this state' });
    }

    const city = new CityMaster({
      cityName,
      state,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      region,
      pincode,
      defaultDeliveryCharge,
      deliveryRadius
    });

    await city.save();

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      city
    });
  } catch (error) {
    console.error('Create city error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/cities/:id
 * Update city (Admin only)
 */
router.put('/:id', [
  verifyToken,
  requireAdmin,
  body('cityName').optional().trim().notEmpty(),
  body('state').optional().trim().notEmpty(),
  body('isActive').optional().isBoolean(),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('region').optional().isIn(['North', 'South', 'East', 'West', 'Central', 'Northeast'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cityName, state, isActive, displayOrder, region, pincode, defaultDeliveryCharge, deliveryRadius } = req.body;

    const city = await CityMaster.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    // Check for duplicate if changing name/state
    if (cityName || state) {
      const checkName = cityName || city.cityName;
      const checkState = state || city.state;

      const existingCity = await CityMaster.findOne({
        _id: { $ne: req.params.id },
        cityName: { $regex: new RegExp(`^${checkName}$`, 'i') },
        state: { $regex: new RegExp(`^${checkState}$`, 'i') }
      });

      if (existingCity) {
        return res.status(400).json({ message: 'City already exists in this state' });
      }
    }

    // Update fields
    if (cityName) city.cityName = cityName;
    if (state) city.state = state;
    if (isActive !== undefined) city.isActive = isActive;
    if (displayOrder !== undefined) city.displayOrder = displayOrder;
    if (region) city.region = region;
    if (pincode) city.pincode = pincode;
    if (defaultDeliveryCharge !== undefined) city.defaultDeliveryCharge = defaultDeliveryCharge;
    if (deliveryRadius !== undefined) city.deliveryRadius = deliveryRadius;

    await city.save();

    res.json({
      success: true,
      message: 'City updated successfully',
      city
    });
  } catch (error) {
    console.error('Update city error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/cities/:id
 * Delete city (Admin only)
 */
router.delete('/:id', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const city = await CityMaster.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    // Check if city is being used in products
    const Product = require('../models/Product');
    const productsUsingCity = await Product.countDocuments({
      'cityPricing.cityId': req.params.id
    });

    if (productsUsingCity > 0) {
      return res.status(400).json({
        message: `Cannot delete city. ${productsUsingCity} product(s) are using this city for pricing.`,
        productsCount: productsUsingCity
      });
    }

    await CityMaster.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'City deleted successfully'
    });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/cities/bulk
 * Bulk create cities (Admin only)
 */
router.post('/bulk', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { cities } = req.body;

    if (!Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({ message: 'Cities array is required' });
    }

    const created = [];
    const errors = [];

    for (const cityData of cities) {
      try {
        const existingCity = await CityMaster.findOne({
          cityName: { $regex: new RegExp(`^${cityData.cityName}$`, 'i') },
          state: { $regex: new RegExp(`^${cityData.state}$`, 'i') }
        });

        if (existingCity) {
          errors.push({ cityName: cityData.cityName, error: 'Already exists' });
          continue;
        }

        const city = new CityMaster(cityData);
        await city.save();
        created.push(city);
      } catch (err) {
        errors.push({ cityName: cityData.cityName, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Created ${created.length} cities`,
      created,
      errors
    });
  } catch (error) {
    console.error('Bulk create cities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
