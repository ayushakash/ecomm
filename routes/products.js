const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const { verifyToken, requireMerchantOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/products
// @desc    Add a new product
// @access  Private (Merchant or Admin)
router.post('/', [
  verifyToken,
  requireMerchantOrAdmin,
  body('name').trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').isIn(['cement', 'sand', 'tmt-bars', 'bricks', 'aggregates', 'steel', 'tools', 'other']).withMessage('Invalid category'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').isIn(['kg', 'ton', 'bag', 'piece', 'cubic-meter', 'sq-ft']).withMessage('Invalid unit'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('minOrderQuantity').optional().isInt({ min: 1 }).withMessage('Minimum order quantity must be at least 1'),
  body('deliveryTime').optional().isInt({ min: 1 }).withMessage('Delivery time must be at least 1 day'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('specifications').optional().isObject().withMessage('Specifications must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let merchantId = req.body.merchantId;

    // If user is merchant, use their merchant ID
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant) {
        return res.status(400).json({ message: 'Merchant profile not found' });
      }
      merchantId = merchant._id;
    } else if (req.user.role === 'admin' && !merchantId) {
      return res.status(400).json({ message: 'Merchant ID is required for admin' });
    }

    const product = new Product({
      ...req.body,
      merchantId
    });

    await product.save();

    res.status(201).json({
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products
// @desc    Get products with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      category,
      area,
      search,
      minPrice,
      maxPrice,
      merchantId,
      enabled = true,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { enabled: enabled === 'true' };
    
    if (category) filter.category = category;
    if (merchantId) filter.merchantId = merchantId;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Area-based filtering
    if (area) {
      const merchants = await Merchant.find({
        area: { $regex: area, $options: 'i' },
        activeStatus: 'approved'
      }).select('_id');
      
      filter.merchantId = { $in: merchants.map(m => m._id) };
    }

    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('merchantId', 'name area rating')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('merchantId', 'name area rating contact');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Merchant or Admin)
router.put('/:id', [
  verifyToken,
  requireMerchantOrAdmin,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').optional().isIn(['cement', 'sand', 'tmt-bars', 'bricks', 'aggregates', 'steel', 'tools', 'other']).withMessage('Invalid category'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').optional().isIn(['kg', 'ton', 'bag', 'piece', 'cubic-meter', 'sq-ft']).withMessage('Invalid unit'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has permission to update this product
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || product.merchantId.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
      }
    }

    // Update product
    const allowedUpdates = [
      'name', 'description', 'category', 'price', 'unit', 'stock',
      'enabled', 'images', 'specifications', 'tags', 'minOrderQuantity', 'deliveryTime'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private (Merchant only)
router.put('/:id/stock', [
  verifyToken,
  requireMerchantOrAdmin,
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has permission to update this product
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || product.merchantId.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
      }
    }

    product.stock = req.body.stock;
    await product.save();

    res.json({
      message: 'Stock updated successfully',
      product
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id/enable
// @desc    Enable/disable product
// @access  Private (Merchant or Admin)
router.put('/:id/enable', [
  verifyToken,
  requireMerchantOrAdmin,
  body('enabled').isBoolean().withMessage('Enabled must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has permission to update this product
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || product.merchantId.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
      }
    }

    product.enabled = req.body.enabled;
    await product.save();

    res.json({
      message: `Product ${req.body.enabled ? 'enabled' : 'disabled'} successfully`,
      product
    });
  } catch (error) {
    console.error('Toggle product enable error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Merchant or Admin)
router.delete('/:id', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has permission to delete this product
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || product.merchantId.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this product' });
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/merchant/my
// @desc    Get current merchant's products
// @access  Private (Merchant only)
router.get('/merchant/my', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    let merchantId = req.query.merchantId;

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant) {
        return res.status(400).json({ message: 'Merchant profile not found' });
      }
      merchantId = merchant._id;
    }

    const { page = 1, limit = 10, enabled } = req.query;
    
    const filter = { merchantId };
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get merchant products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
