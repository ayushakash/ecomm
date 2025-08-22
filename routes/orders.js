const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const { verifyToken, requireCustomer, requireMerchantOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private (Customer only)
router.post('/', [
  verifyToken,
  requireCustomer,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customerPhone').trim().notEmpty().withMessage('Phone number is required'),
  body('customerAddress').trim().notEmpty().withMessage('Address is required'),
  body('paymentMethod').optional().isIn(['cod', 'online', 'bank-transfer']).withMessage('Invalid payment method'),
  body('deliveryInstructions').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, customerPhone, customerAddress, paymentMethod = 'cod', deliveryInstructions } = req.body;

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).populate('merchantId');
      
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }

      if (!product.enabled) {
        return res.status(400).json({ message: `Product ${product.name} is not available` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice,
        unit: product.unit
      });

      // Update stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate taxes and delivery charges
    const tax = subtotal * 0.18; // 18% GST
    const deliveryCharge = subtotal > 1000 ? 0 : 100; // Free delivery above 1000
    const totalAmount = subtotal + tax + deliveryCharge;

    // Create order
    const order = new Order({
      customerId: req.user._id,
      customerName: req.user.name,
      customerPhone,
      customerAddress,
      customerArea: req.user.area,
      items: orderItems,
      subtotal,
      tax,
      deliveryCharge,
      totalAmount,
      paymentMethod,
      deliveryInstructions,
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    await order.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders
// @desc    Get orders with filtering
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filter = {};

    // Filter by user role
    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (merchant) {
        filter.assignedMerchantId = merchant._id;
      }
    }
    // Admin can see all orders

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'name email')
      .populate('assignedMerchantId', 'name contact')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('assignedMerchantId', 'name contact area')
      .populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission to view this order
    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || order.assignedMerchantId?._id.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/assign
// @desc    Assign order to merchant
// @access  Private (Admin only)
router.put('/:id/assign', [
  verifyToken,
  requireAdmin,
  body('merchantId').isMongoId().withMessage('Valid merchant ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { merchantId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if merchant exists and is approved
    const merchant = await Merchant.findById(merchantId);
    if (!merchant || merchant.activeStatus !== 'approved') {
      return res.status(400).json({ message: 'Invalid or inactive merchant' });
    }

    order.assignedMerchantId = merchantId;
    order.assignedMerchantName = merchant.name;
    order.status = 'approved';
    await order.save();

    res.json({
      message: 'Order assigned successfully',
      order
    });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Merchant or Admin)
router.put('/:id/status', [
  verifyToken,
  requireMerchantOrAdmin,
  body('status').isIn(['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('note').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission to update this order
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || order.assignedMerchantId?.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this order' });
      }
    }

    // Update status
    order.status = status;
    
    // Add note to status history
    if (note) {
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note
      });
    }

    // Set delivery date when status is delivered
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private (Customer only)
router.put('/:id/cancel', [verifyToken, requireCustomer], async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (!['pending', 'approved'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/analytics/summary
// @desc    Get order analytics summary
// @access  Private (Admin only)
router.get('/analytics/summary', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const monthlyRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    res.json({
      summary: {
        totalOrders,
        pendingOrders,
        processingOrders,
        deliveredOrders,
        totalRevenue: totalRevenue[0]?.total || 0
      },
      monthlyRevenue
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/merchant/dashboard
// @desc    Get merchant dashboard data
// @access  Private (Merchant only)
router.get('/merchant/dashboard', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ userId: req.user._id });
    if (!merchant) {
      return res.status(400).json({ message: 'Merchant profile not found' });
    }

    const totalOrders = await Order.countDocuments({ assignedMerchantId: merchant._id });
    const pendingOrders = await Order.countDocuments({ 
      assignedMerchantId: merchant._id, 
      status: 'approved' 
    });
    const processingOrders = await Order.countDocuments({ 
      assignedMerchantId: merchant._id, 
      status: 'processing' 
    });
    const completedOrders = await Order.countDocuments({ 
      assignedMerchantId: merchant._id, 
      status: 'delivered' 
    });

    const recentOrders = await Order.find({ assignedMerchantId: merchant._id })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      summary: {
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders
      },
      recentOrders
    });
  } catch (error) {
    console.error('Get merchant dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
