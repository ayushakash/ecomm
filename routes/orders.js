const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const { verifyToken, requireCustomer, requireMerchantOrAdmin, requireAdmin } = require('../middleware/auth');
const MerchantProduct = require('../models/MerchantProduct');
const { getPricingCalculator } = require('../utils/pricingUtils');
const OrderLogService = require('../services/OrderLogService');
const AbandonedCartService = require('../services/AbandonedCartService');

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

    const { items, customerPhone, customerAddress, paymentMethod = 'cod', deliveryInstructions, deliveryLocation } = req.body;

    // Get pricing calculator with current settings
    const pricingCalculator = await getPricingCalculator();
    
    const orderItems = [];
    let totalWeight = 0;

    // Validate items and calculate prices
    for (const item of items) {
      const product = await Product.findById(item.productId).populate('category', 'name');
      if (!product) return res.status(400).json({ message: `Product ${item.productId} not found` });
      if (!product.enabled) return res.status(400).json({ message: `Product ${product.name} is not available` });

      // Check total available stock using centralized validation
      const totalStock = await pricingCalculator.getTotalStock(item.productId);
      if (totalStock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${totalStock}, Requested: ${item.quantity}` 
        });
      }

      // Get display price based on current settings
      const displayPrice = await pricingCalculator.getDisplayPrice(product);
      const totalPrice = displayPrice * item.quantity;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: displayPrice,
        totalPrice,
        sku: product.sku,
        unit: product.unit,
        weight: product.weight || 0,
        assignedMerchantId: null, // assigned later
        itemStatus: 'pending'
      });

      totalWeight += (product.weight || 0) * item.quantity;
    }

    // Calculate totals using centralized pricing
    const customerData = {
      distance: req.user.distance || 0, // This could come from user profile or be calculated
      area: req.user.area
    };
    
    const totals = pricingCalculator.calculateOrderTotals(orderItems, customerData);

    // Generate order number
    const orderCount = await Order.countDocuments() + 1;
    const orderNumber = `ORD${String(orderCount).padStart(6, '0')}`;

    const order = new Order({
      orderNumber,
      customerId: req.user._id,
      customerName: req.user.name,
      customerPhone,
      customerAddress,
      customerArea: req.user.area,
      deliveryLocation: deliveryLocation || {
        address: customerAddress,
        area: req.user.area,
        coordinates: [0, 0],
        isCurrentLocation: false
      },
      items: orderItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      deliveryCharge: totals.deliveryCharges,
      platformFee: totals.platformFee || 0,
      totalAmount: totals.totalAmount,
      paymentMethod,
      deliveryInstructions,
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      pricingBreakdown: totals.breakdown // Store pricing settings used
    });

    await order.save();

    // Reserve stock across merchants
    await reserveStockForOrder(order);

    // Log order creation (non-blocking)
    OrderLogService.logOrderEvent(
      'order_created',
      order,
      {
        userId: req.user._id,
        userType: 'customer',
        userName: req.user.name,
        userEmail: req.user.email,
        userPhone: req.user.phone || customerPhone
      },
      req,
      {
        metadata: {
          itemCount: orderItems.length,
          totalWeight: totalWeight,
          paymentMethod: paymentMethod
        }
      }
    ).catch(logError => {
      console.error('Error logging order creation:', logError);
    });

    // Mark abandoned cart as converted if exists (non-blocking)
    AbandonedCartService.markAsConverted(req.user._id, order._id).catch(cartError => {
      console.error('Error marking cart as converted:', cartError);
    });

    res.status(201).json({ 
      message: 'Order placed successfully', 
      order,
      pricingBreakdown: totals
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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

    // For merchants, only show items assigned to them (filter already applied above)
    let resultOrders = orders;
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({ userId: req.user._id });
      
      resultOrders = orders.map(order => {
        const filteredItems = order.items.filter(item => {
          // Only show items assigned to this merchant
          return item.assignedMerchantId?._id.equals(merchant._id);
        });
        return { ...order.toObject(), items: filteredItems };
      }).filter(order => order.items.length > 0); // Only return orders with relevant items
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
  requireMerchantOrAdmin,
], async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    let merchantId;

    if (req.user.role === 'merchant') {
      // merchant assigns only themselves
      const merchant = await Merchant.findOne({ userId: req.user._id });
      if (!merchant) {
        return res.status(400).json({ message: 'Merchant not found' });
      }
      merchantId = merchant._id;
    } else if (req.user.role === 'admin') {
      // admin can choose merchant freely
      if (!req.body.merchantId) {
        return res.status(400).json({ message: 'merchantId is required for admin assignment' });
      }
      merchantId = req.body.merchantId;
    }

    const order = await assignMerchantToItem(orderId, itemId, merchantId, { validateMerchant: true });

    // Log merchant assignment
    try {
      // Get merchant phone from merchant record if user is a merchant
      let userPhone = req.user.phone;
      if (req.user.role === 'merchant') {
        const merchantUser = await Merchant.findOne({ userId: req.user._id });
        if (merchantUser && merchantUser.contact?.phone) {
          userPhone = merchantUser.contact.phone;
        }
      }

      await OrderLogService.logOrderEvent(
        'order_assigned',
        order,
        {
          userId: req.user._id,
          userType: req.user.role,
          merchantName: req.user.name,
          merchantEmail: req.user.email,
          merchantPhone: userPhone
        },
        req,
        {
          previousStatus: 'pending',
          metadata: {
            merchantId: merchantId,
            itemId: itemId,
            assignedBy: req.user.role
          }
        }
      );
    } catch (logError) {
      console.error('Error logging merchant assignment:', logError);
    }

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
      if (!merchant || item.assignedMerchantId?.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const previousStatus = item.itemStatus;
    item.itemStatus = status;
    if (note) {
      order.statusHistory.push({ status, timestamp: new Date(), note });
    }

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
      // Handle automatic stock reduction on delivery
      await handleStockReductionOnDelivery(orderId, itemId);
    }

    await order.save();

    // Log status change
    try {
      let eventType;
      switch(status) {
        case 'processing':
          eventType = 'order_accepted';
          break;
        case 'shipped':
          eventType = 'order_shipped';
          break;
        case 'delivered':
          eventType = 'order_delivered';
          break;
        case 'cancelled':
          eventType = 'order_cancelled';
          break;
        default:
          eventType = 'order_status_updated';
      }

      await OrderLogService.logOrderEvent(
        eventType,
        order,
        {
          userId: req.user._id,
          userType: req.user.role,
          userName: req.user.name,
          userEmail: req.user.email,   //TODO add the phone number for merchant 
          userPhone: req.user.phone
        },
        req,
        {
          previousStatus: previousStatus,
          metadata: {
            itemId: itemId,
            note: note,
            statusChangedBy: req.user.role
          }
        }
      );
    } catch (logError) {
      console.error('Error logging status change:', logError);
    }

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

    // Log order cancellation
    try {
      await OrderLogService.logOrderEvent(
        'order_cancelled',
        order,
        {
          userId: req.user._id,
          userType: 'customer',
          userName: req.user.name,
          userEmail: req.user.email,
          userPhone: req.user.phone
        },
        req,
        {
          previousStatus: 'pending',
          metadata: {
            cancelledBy: 'customer',
            stockRestored: true
          }
        }
      );
    } catch (logError) {
      console.error('Error logging order cancellation:', logError);
    }

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ADMIN DASHBOARD & ANALYTICS
 * ---------------------------
 */

// Enhanced Admin Dashboard with Today's Analytics
router.get('/admin/dashboard', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const User = require('../models/User');
    const Merchant = require('../models/Merchant');
    const Product = require('../models/Product');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this week's date range
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    thisWeek.setHours(0, 0, 0, 0);

    // Basic counts
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalMerchants = await User.countDocuments({ role: 'merchant' });
    const activeMerchants = await Merchant.countDocuments({ activeStatus: 'approved' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Today's metrics
    const todaysOrders = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todaysRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.itemStatus": "delivered",
        "createdAt": { $gte: today, $lt: tomorrow }
      }},
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    const todaysNewUsers = await User.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todaysNewMerchants = await Merchant.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // This week's metrics
    const weeklyOrders = await Order.countDocuments({
      createdAt: { $gte: thisWeek }
    });

    const weeklyRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.itemStatus": "delivered",
        "createdAt": { $gte: thisWeek }
      }},
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    // Platform revenue (all time)
    const platformRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    // Real-time order statuses
    const pendingOrdersCount = await Order.countDocuments({ orderStatus: 'pending' });
    const processingOrdersCount = await Order.countDocuments({ orderStatus: 'processing' });
    const deliveredOrdersCount = await Order.countDocuments({ orderStatus: 'delivered' });

    // Pending items awaiting merchant assignment
    const unassignedItemsCount = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.assignedMerchantId": { $exists: false },
        "items.itemStatus": "pending"
      } },
      { $count: "count" }
    ]);

    // Pending merchant approvals
    const pendingMerchants = await Merchant.countDocuments({ activeStatus: 'pending' });

    // Pending user approvals (if any approval system exists)
    const pendingUsers = await User.countDocuments({ status: 'pending' });

    // Low stock products (stock < 10)
    const lowStockProducts = await Product.countDocuments({ 
      $expr: { $lt: ["$totalStock", 10] }
    });

    // Active merchants (recently active)
    const recentlyActiveMerchants = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.assignedMerchantId": { $ne: null },
        "createdAt": { $gte: thisWeek }
      }},
      { $group: { _id: "$items.assignedMerchantId" } },
      { $count: "count" }
    ]);

    // Most selling products
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // Top merchants by revenue
    const topMerchants = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered", "items.assignedMerchantId": { $ne: null } } },
      {
        $group: {
          _id: "$items.assignedMerchantId",
          totalRevenue: { $sum: "$items.totalPrice" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'merchants',
          localField: '_id',
          foreignField: '_id',
          as: 'merchantInfo'
        }
      },
      { $unwind: '$merchantInfo' }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.itemStatus": "delivered",
        "createdAt": { $gte: sixMonthsAgo }
      }},
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$items.totalPrice" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({
      summary: {
        // All-time metrics
        totalUsers,
        totalCustomers,
        totalMerchants,
        activeMerchants,
        totalProducts,
        totalOrders,
        platformRevenue: platformRevenue[0]?.total || 0,
        
        // Today's metrics
        todaysOrders,
        todaysRevenue: todaysRevenue[0]?.total || 0,
        todaysNewUsers,
        todaysNewMerchants,
        
        // Weekly metrics
        weeklyOrders,
        weeklyRevenue: weeklyRevenue[0]?.total || 0,
        
        // Real-time status counts
        pendingOrders: pendingOrdersCount,
        processingOrders: processingOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        unassignedItems: unassignedItemsCount[0]?.count || 0,
        activeThisWeek: recentlyActiveMerchants[0]?.count || 0,
        
        // New metrics
        pendingMerchants,
        pendingUsers,
        lowStockItems: lowStockProducts
      },
      topProducts,
      topMerchants,
      recentOrders,
      monthlyRevenue,
      
      // Additional insights
      insights: {
        averageOrderValue: totalOrders > 0 ? Math.round((platformRevenue[0]?.total || 0) / totalOrders) : 0,
        merchantUtilization: totalMerchants > 0 ? Math.round((activeMerchants / totalMerchants) * 100) : 0,
        todayGrowth: {
          orders: todaysOrders,
          revenue: todaysRevenue[0]?.total || 0,
          users: todaysNewUsers
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
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
    // Count actual items, not orders
    const totalOrdersCount = await Order.countDocuments();
    
    const pendingItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "pending" } },
      { $count: "count" }
    ]);
    const pendingItems = pendingItemsAgg[0]?.count || 0;

    const processingItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "processing" } },
      { $count: "count" }
    ]);
    const processingItems = processingItemsAgg[0]?.count || 0;

    const deliveredItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      { $count: "count" }
    ]);
    const deliveredItems = deliveredItemsAgg[0]?.count || 0;

    const totalRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    res.json({
      summary: {
        totalOrders: totalOrdersCount,
        pendingOrders: pendingItems,
        processingOrders: processingItems,
        deliveredOrders: deliveredItems,
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

    // Today's dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count actual items, not orders
    const totalItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id } },
      { $count: "count" }
    ]);
    const totalItems = totalItemsAgg[0]?.count || 0;

    // Today's metrics
    const todaysOrdersAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "createdAt": { $gte: today, $lt: tomorrow }
        } 
      },
      { $count: "count" }
    ]);
    const todaysOrders = todaysOrdersAgg[0]?.count || 0;

    const todaysRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered",
          "createdAt": { $gte: today, $lt: tomorrow }
        } 
      },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const todaysRevenue = todaysRevenueAgg[0]?.total || 0;

    const completedTodayAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered",
          "updatedAt": { $gte: today, $lt: tomorrow }
        } 
      },
      { $count: "count" }
    ]);
    const completedToday = completedTodayAgg[0]?.count || 0;

    // Status counts
    const pendingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "assigned" } },
      { $count: "count" }
    ]);
    const pending = pendingAgg[0]?.count || 0;

    const processingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "processing" } },
      { $count: "count" }
    ]);
    const processing = processingAgg[0]?.count || 0;

    const completedAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "delivered" } },
      { $count: "count" }
    ]);
    const completed = completedAgg[0]?.count || 0;

    // Total revenue
    const totalRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered"
        } 
      },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Unassigned orders available
    const unassignedOrdersAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": null, "items.itemStatus": "pending" } },
      { $count: "count" }
    ]);
    const unassignedOrders = unassignedOrdersAgg[0]?.count || 0;

    // Success rate
    const totalOrders = totalItems;
    const successRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;

    // Low stock items (from products this merchant has)
    const MerchantProduct = require('../models/MerchantProduct');
    const lowStockItems = await MerchantProduct.countDocuments({
      merchantId: merchant._id,
      stock: { $lt: 10 },
      enabled: true
    });

    const recentOrders = await Order.find({ 'items.assignedMerchantId': merchant._id })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Format recent orders for frontend
    const formattedRecentOrders = recentOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      status: order.orderStatus,
      createdAt: order.createdAt
    }));

    res.json({
      summary: { 
        totalItems,
        totalOrders: totalItems,
        totalRevenue,
        todaysOrders,
        todaysRevenue,
        completedToday,
        pendingOrders: pending, 
        processingOrders: processing, 
        completedOrders: completed,
        unassignedOrders,
        lowStockItems,
        successRate
      },
      recentOrders: formattedRecentOrders
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

    // Count actual items, not orders
    const totalItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id } },
      { $count: "count" }
    ]);
    const totalItems = totalItemsAgg[0]?.count || 0;

    const pendingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "pending" } },
      { $count: "count" }
    ]);
    const pending = pendingAgg[0]?.count || 0;

    const processingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "processing" } },
      { $count: "count" }
    ]);
    const processing = processingAgg[0]?.count || 0;

    const deliveredAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "delivered" } },
      { $count: "count" }
    ]);
    const delivered = deliveredAgg[0]?.count || 0;

    const cancelledAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "cancelled" } },
      { $count: "count" }
    ]);
    const cancelled = cancelledAgg[0]?.count || 0;

    const totalRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered",
          "createdAt": { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$items.totalPrice" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Recent orders with full details
    const recentOrders = await Order.find({ 'items.assignedMerchantId': merchant._id })
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Format recent orders for frontend
    const formattedRecentOrders = recentOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      status: order.orderStatus,
      createdAt: order.createdAt
    }));

    // Calculate insights
    const averageOrderValue = totalItems > 0 ? Math.round(totalRevenue / totalItems) : 0;
    const successRate = totalItems > 0 ? Math.round((delivered / totalItems) * 100) : 0;
    
    // Best month calculation
    let bestMonth = 'N/A';
    let bestMonthRevenue = 0;
    if (monthlyRevenue.length > 0) {
      const bestMonthData = monthlyRevenue.reduce((max, current) => 
        current.revenue > max.revenue ? current : max
      );
      bestMonth = `${bestMonthData._id.year}-${String(bestMonthData._id.month).padStart(2, '0')}`;
      bestMonthRevenue = bestMonthData.revenue;
    }

    // Growth rate calculation (current vs previous month)
    let growthRate = 0;
    if (monthlyRevenue.length >= 2) {
      const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
      const previousMonth = monthlyRevenue[monthlyRevenue.length - 2];
      if (previousMonth.revenue > 0) {
        growthRate = Math.round(((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100);
      }
    }

    res.json({
      summary: { 
        totalOrders: totalItems, 
        pendingOrders: pending, 
        processingOrders: processing, 
        deliveredOrders: delivered, 
        cancelledOrders: cancelled, 
        totalRevenue 
      },
      monthlyRevenue,
      recentOrders: formattedRecentOrders,
      insights: {
        averageOrderValue,
        successRate,
        bestMonth,
        bestMonthRevenue,
        growthRate
      }
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
      const productExists = await MerchantProduct.exists({
        productId: item.productId,
        merchantId,
        enabled: true,
      });

      if (!productExists) {
        throw new Error('Selected merchant does not sell this product or is inactive');
      }
    }

    merchant = await Merchant.findById(merchantId);
    if (!merchant) throw new Error('Merchant not found');
  } else {
    // Auto-assign: pick first available merchant for this product
    const merchantProducts = await MerchantProduct.find({
      productId: item.productId,
      enabled: true,
    }).populate({
      path: 'merchantId',
      match: { activeStatus: 'approved' }
    });

    const availableMerchants = merchantProducts
      .map(mp => mp.merchantId)
      .filter(m => m); // filter out nulls (inactive merchants)

    if (!availableMerchants.length) throw new Error('No merchants available for this product');

    merchant = availableMerchants[0];
    merchantId = merchant._id;
  }

  // Assign merchant to item
  item.assignedMerchantId = merchant._id;
  item.assignedMerchantName = merchant.name || '';
  item.itemStatus = 'assigned';

  // Deduct stock from merchant's inventory when accepting the order
  try {
    const merchantProduct = await MerchantProduct.findOne({
      productId: item.productId,
      merchantId: merchant._id,
      enabled: true
    });

    if (!merchantProduct) {
      throw new Error('Merchant product not found');
    }

    if (merchantProduct.stock < item.quantity) {
      throw new Error(`Insufficient stock. Available: ${merchantProduct.stock}, Required: ${item.quantity}`);
    }

    // Deduct stock
    merchantProduct.stock -= item.quantity;
    await merchantProduct.save();
    
    console.log(`Stock deducted: ${item.quantity} units of ${item.productName} from merchant ${merchant.name} (ID: ${merchant._id})`);
  } catch (stockError) {
    console.error('Stock deduction error:', stockError);
    throw new Error(`Failed to deduct stock: ${stockError.message}`);
  }

  // Update overall order status if all items are assigned
  const allAssigned = order.items.every(i => i.itemStatus === 'assigned');
  if (allAssigned) order.orderStatus = 'assigned';

  // Save order
  await order.save();

  return order;
}


// Get unassigned orders (for merchants to claim)
router.get('/status/unassigned', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
  const merchant = await Merchant.findOne({ userId: req.user._id });
if (!merchant) {
  return res.status(400).json({ message: 'Merchant not found' });
}

const merchantProducts = await MerchantProduct.find({
  merchantId: merchant._id,   // ✅ use merchant._id, not user._id
  enabled: true,
  stock: { $gt: 0 }
}).select('productId');

    const merchantProductIds = merchantProducts.map(mp => mp.productId.toString());
  

    if (merchantProductIds.length === 0) {
      return res.json([]); // No products in stock, nothing to assign
    }

    // ✅ Step 2: Find orders containing unassigned items for those products
    const unassignedOrders = await Order.find({
      $or: [
        { orderStatus: 'pending' },
        { orderStatus: 'processing' } // Include processing orders that might have mixed assigned/unassigned items
      ],
      'items.itemStatus': 'pending',
      'items.assignedMerchantId': null,
      'items.productId': { $in: merchantProductIds }
    }).populate('customerId', 'name phone');

    // ✅ Step 3: Filter to show only unassigned items relevant to this merchant
    const filteredOrders = unassignedOrders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item =>
        merchantProductIds.includes(item.productId.toString()) &&
        item.itemStatus === 'pending' &&
        item.assignedMerchantId === null
      )
    })).filter(order => order.items.length > 0); // Only return orders that have unassigned items for this merchant

    res.json(filteredOrders);
  } catch (error) {
    console.error('Unassigned order fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});







// Get order by ID (must be placed AFTER the /unassigned route)
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /orders/:orderId/items/:itemId/reject
router.post("/:orderId/items/:itemId/reject", async (req, res) => {
  const { orderId, itemId } = req.params;
  const merchantId = req.user._id;

  await Order.updateOne(
    { _id: orderId, "items._id": itemId },
    { $addToSet: { "items.$.rejectedBy": merchantId } } 
  );

  res.json({ success: true });
});



// Merchant claims an item
router.post('/claim', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'merchant') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { orderId, itemId } = req.body;
    const merchant = await Merchant.findOne({ userId: req.user._id });

    if (!merchant) {
      return res.status(400).json({ message: 'Merchant not found' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, "items._id": itemId, "items.assignedMerchantId": null },
      { $set: { "items.$.assignedMerchantId": merchant._id, "items.$.itemStatus": "assigned" } },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ message: 'Item already taken by another merchant' });
    }

    res.json({ message: 'Order claimed successfully', order });
  } catch (error) {
    console.error('Claim order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



/**
 * ---------------------------
 * STOCK MANAGEMENT FUNCTIONS
 * ---------------------------
 */

/**
 * Reserve stock for an order by reducing merchant stock
 */
async function reserveStockForOrder(order) {
  for (const item of order.items) {
    let remainingQuantity = item.quantity;
    
    // Find merchants with stock for this product
    const merchantProducts = await MerchantProduct.find({
      productId: item.productId,
      enabled: true,
      stock: { $gt: 0 }
    }).sort({ stock: -1 }); // Start with merchants with most stock
    
    for (const merchantProduct of merchantProducts) {
      if (remainingQuantity <= 0) break;
      
      const reserveAmount = Math.min(remainingQuantity, merchantProduct.stock);
      
      // Reduce merchant stock
      merchantProduct.stock -= reserveAmount;
      await merchantProduct.save();
      
      remainingQuantity -= reserveAmount;
      
      console.log(`Reserved ${reserveAmount} units of ${item.productName} from merchant ${merchantProduct.merchantId}`);
    }
    
    if (remainingQuantity > 0) {
      console.warn(`Could not fully reserve stock for ${item.productName}. Missing: ${remainingQuantity} units`);
    }
  }
}

/**
 * Reduce stock when order is delivered (if auto-reduce is enabled)
 */
async function handleStockReductionOnDelivery(orderId, itemId) {
  try {
    const AppSettings = require('../models/AppSettings');
    const settings = await AppSettings.getSettings();
    
    if (!settings.autoReduceStockOnDelivery) {
      return; // Auto stock reduction is disabled
    }
    
    const order = await Order.findById(orderId);
    if (!order) return;
    
    const item = order.items.id(itemId);
    if (!item || item.itemStatus !== 'delivered') return;
    
    // Find the merchant product and reduce stock
    if (item.assignedMerchantId) {
      const merchantProduct = await MerchantProduct.findOne({
        merchantId: item.assignedMerchantId,
        productId: item.productId
      });
      
      if (merchantProduct && merchantProduct.stock >= item.quantity) {
        merchantProduct.stock -= item.quantity;
        await merchantProduct.save();
        
        console.log(`Auto-reduced ${item.quantity} units of ${item.productName} from merchant ${item.assignedMerchantId} stock`);
      }
    }
  } catch (error) {
    console.error('Stock reduction error:', error);
  }
}

/**
 * ---------------------------
 * GET ORDER LIFECYCLE (Admin)
 * ---------------------------
 */
// router.get('/:orderId/lifecycle', requireMerchantOrAdmin, async (req, res) => {
  router.get('/:orderId/lifecycle',  async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .select('orderNumber lifecycle customerId customerName orderStatus totalAmount')
      .populate('customerId', 'name email phone');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        orderStatus: order.orderStatus,
        totalAmount: order.totalAmount
      },
      lifecycle: order.lifecycle || []
    });
  } catch (error) {
    console.error('Error fetching order lifecycle:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
