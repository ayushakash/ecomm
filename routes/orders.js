const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const { verifyToken, requireCustomer, requireMerchantOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * ---------------------------
 * CREATE ORDER
 * ---------------------------
 */
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
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { items, customerPhone, customerAddress, paymentMethod = 'cod', deliveryInstructions } = req.body;

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ message: `Product ${item.productId} not found` });
      if (!product.enabled) return res.status(400).json({ message: `Product ${product.name} is not available` });
      if (product.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice,
        unit: product.unit,
        merchantId: null, // assigned later
        status: 'pending'
      });

      product.stock -= item.quantity;
      await product.save();
    }

    const tax = subtotal * 0.18;
    const deliveryCharge = subtotal > 1000 ? 0 : 100;
    const totalAmount = subtotal + tax + deliveryCharge;

    const order = new Order({
      orderNumber: "TEMP",
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
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await order.save();

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * GET ORDERS (with role filters)
 * ---------------------------
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = {};

    // Filter based on role
    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (merchant) {
        // Only include orders where items are assigned to this merchant
        filter['items.assignedMerchantId'] = merchant._id;
      }
    }

    if (status) {
      filter['items.itemStatus'] = status; // match the updated field name
    }

    // Fetch orders with pagination
    const orders = await Order.find(filter)
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .populate('items.assignedMerchantId', 'name contact area')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    // For merchants, only show items assigned to them
    let resultOrders = orders;
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      resultOrders = orders.map(order => {
        const filteredItems = order.items.filter(item =>
          item.assignedMerchantId?._id.equals(merchant._id)
        );
        return { ...order.toObject(), items: filteredItems };
      });
    }

    res.json({
      orders: resultOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


/**
 * ---------------------------
 * GET ORDER BY ID
 * ---------------------------
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name images')
      .populate('items.merchantId', 'name contact area');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || !order.items.some(i => i.merchantId?.toString() === merchant._id.toString())) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ASSIGN MERCHANT TO ITEM
 * ---------------------------
 */
router.put('/:orderId/items/:itemId/assign', [
  verifyToken,
  requireAdmin,
  body('merchantId').isMongoId().withMessage('Valid merchant ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { orderId, itemId } = req.params;
    const { merchantId } = req.body;

    const order = await assignMerchantToItem(orderId, itemId, merchantId, { validateMerchant: true });

    res.json({ message: "Merchant assigned successfully", order });
  } catch (error) {
    console.error("Assign item error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * ---------------------------
 * UPDATE ITEM STATUS
 * ---------------------------
 */
router.put('/:orderId/items/:itemId/status', [
  verifyToken,
  requireMerchantOrAdmin,
  body('status').isIn(['pending', 'assigned', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('note').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { orderId, itemId } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant || item.merchantId?.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    item.status = status;
    if (note) {
      order.statusHistory.push({ status, timestamp: new Date(), note });
    }

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    res.json({ message: 'Item status updated successfully', order });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * CANCEL ORDER (Customer)
 * ---------------------------
 */
router.put('/:id/cancel', [verifyToken, requireCustomer], async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Restore stock for all items
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
      item.status = 'cancelled';
    }

    await order.save();

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ADMIN ANALYTICS
 * ---------------------------
 */
router.get('/analytics/summary', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingItems = await Order.countDocuments({ 'items.status': 'pending' });
    const processingItems = await Order.countDocuments({ 'items.status': 'processing' });
    const deliveredItems = await Order.countDocuments({ 'items.status': 'delivered' });

    const totalRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    res.json({
      summary: {
        totalOrders,
        pendingItems,
        processingItems,
        deliveredItems,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * MERCHANT DASHBOARD
 * ---------------------------
 */
router.get('/merchant/dashboard', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ userId: req.user._id });
    if (!merchant) return res.status(400).json({ message: 'Merchant not found' });

    const totalItems = await Order.countDocuments({ 'items.merchantId': merchant._id });
    const pending = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'assigned' });
    const processing = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'processing' });
    const completed = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'delivered' });

    const recentOrders = await Order.find({ 'items.merchantId': merchant._id })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      summary: { totalItems, pending, processing, completed },
      recentOrders
    });
  } catch (error) {
    console.error('Merchant dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * MERCHANT ANALYTICS
 * ---------------------------
 */
router.get('/merchant/analytics/summary', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ userId: req.user._id });
    if (!merchant) return res.status(400).json({ message: 'Merchant not found' });

    const totalItems = await Order.countDocuments({ 'items.merchantId': merchant._id });
    const pending = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'pending' });
    const processing = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'processing' });
    const delivered = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'delivered' });
    const cancelled = await Order.countDocuments({ 'items.merchantId': merchant._id, 'items.status': 'cancelled' });

    const totalRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.merchantId": merchant._id, "items.status": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    res.json({
      summary: { totalItems, pending, processing, delivered, cancelled, totalRevenue }
    });
  } catch (error) {
    console.error('Merchant analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put("/:orderId/assign-merchant", async (req, res) => {
  const { merchantId, itemId } = req.body;
  try {
    const order = await assignMerchantToItem(
      req.params.orderId,
      itemId,
      merchantId, 
      { validateMerchant: !!merchantId }
    );

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


async function assignMerchantToItem(orderId, itemId, merchantId, options = { validateMerchant: true }) {
  // Find order
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  // Find item
  const item = order.items.id(itemId);
  if (!item) throw new Error('Order item not found');

  let merchant;

  if (merchantId) {
    // If manual assignment, validate merchant has this product
    if (options.validateMerchant) {
      const productExists = await Product.exists({
        _id: item.productId,
        merchantId,
        enabled: true,
      });

      if (!productExists) throw new Error('Selected merchant does not sell this product or is inactive');
    }

    merchant = await Merchant.findById(merchantId);
  } else {
    // Auto-assign: pick first available merchant for this product
    const merchants = await Merchant.find({
      _id: { $in: await Product.find({ _id: item.productId, enabled: true }).distinct('merchantId') },
      activeStatus: 'approved',
    });

    if (!merchants.length) throw new Error('No merchants available for this product');
    merchant = merchants[0];
    merchantId = merchant._id;
  }

  // Assign merchant to item
  item.assignedMerchantId = merchant._id;
  item.assignedMerchantName = merchant.name || '';
  item.itemStatus = 'assigned';

  // Update overall order status if all items are assigned
  const allAssigned = order.items.every(i => i.itemStatus === 'assigned');
  if (allAssigned) order.orderStatus = 'assigned';

  // Save order
  await order.save();

  return order;
}

module.exports = router;
