const express = require('express');
const router = express.Router();
const AbandonedCartService = require('../services/AbandonedCartService');
const { verifyToken: auth, requireAdmin: adminAuth, optionalAuth } = require('../middleware/auth');

// Track cart activity (called when user adds/removes items).
// Guest-accessible: anonymous visitors are tracked via a client-generated
// guestId; logged-in users via their account (guest cart is claimed on login).
router.post('/track', optionalAuth, async (req, res) => {
  try {
    const { cartItems, guestId } = req.body;
    const userId = req.user?._id;

    const validGuestId = typeof guestId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(guestId) ? guestId : null;
    if (!userId && !validGuestId) {
      return res.status(400).json({ message: 'guestId is required for anonymous tracking' });
    }
    if (Array.isArray(cartItems) && cartItems.length > 50) {
      return res.status(400).json({ message: 'Too many cart items' });
    }

    // Logged-in users: server-derived contact details for abandoned-cart notifications
    const userDetails = req.user
      ? { name: req.user.name, email: req.user.email, phone: req.user.phone }
      : undefined;

    const result = await AbandonedCartService.trackCartActivity(
      { userId, guestId: validGuestId },
      cartItems,
      userDetails
    );

    res.json({
      success: true,
      message: result ? 'Cart activity tracked' : 'Cart cleared',
      abandonedCart: result ? { _id: result._id } : null
    });
  } catch (error) {
    console.error('Error tracking cart activity:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark cart as converted (called when order is placed)
router.post('/convert', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    const converted = await AbandonedCartService.markAsConverted(userId, orderId);

    res.json({
      success: true,
      converted,
      message: converted ? 'Cart marked as converted' : 'No abandoned cart found'
    });
  } catch (error) {
    console.error('Error converting cart:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all abandoned carts (Admin only)
router.get('/all', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      minValue,
      maxValue,
      isConverted,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = req.query;

    const result = await AbandonedCartService.getAbandonedCarts({
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
      isConverted: isConverted ? isConverted === 'true' : undefined,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching abandoned carts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get abandoned cart analytics (Admin only)
router.get('/analytics', auth, adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await AbandonedCartService.getAnalytics({
      startDate,
      endDate
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching abandoned cart analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send manual notification to abandoned cart (Admin only)
router.post('/:cartId/notify', auth, adminAuth, async (req, res) => {
  try {
    const { cartId } = req.params;
    const { message, channel = 'n8n' } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const result = await AbandonedCartService.sendManualNotification(
      cartId,
      message,
      channel
    );

    res.json({
      success: result?.success || false,
      message: result?.success ? 'Notification sent successfully' : 'Failed to send notification',
      result
    });
  } catch (error) {
    console.error('Error sending manual notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send abandoned cart notification by type (Admin only)
router.post('/:cartId/notify/:type', auth, adminAuth, async (req, res) => {
  try {
    const { cartId, type } = req.params;

    const validTypes = ['15min', '1hour', '24hour', '3days'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }

    const result = await AbandonedCartService.sendAbandonedCartNotification(cartId, type);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      notifications: result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's abandoned cart
router.get('/mine', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const AbandonedCart = require('../models/AbandonedCart');
    const cart = await AbandonedCart.findOne({ 
      userId, 
      isConverted: false 
    })
    .populate('cartItems.productId', 'name price images')
    .populate('cartItems.merchantId', 'name')
    .lean();

    res.json({
      success: true,
      cart
    });
  } catch (error) {
    console.error('Error fetching user abandoned cart:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cleanup old abandoned carts (Admin only)
router.post('/cleanup', auth, adminAuth, async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

    const deletedCount = await AbandonedCartService.cleanup(daysOld);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old abandoned carts`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up abandoned carts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get abandoned cart details by ID (Admin only)
router.get('/:cartId', auth, adminAuth, async (req, res) => {
  try {
    const { cartId } = req.params;

    const AbandonedCart = require('../models/AbandonedCart');
    const cart = await AbandonedCart.findById(cartId)
      .populate('userId', 'name email phone')
      .populate('cartItems.productId', 'name price images')
      .populate('cartItems.merchantId', 'name')
      .populate('orderId', 'orderNumber totalAmount')
      .lean();

    if (!cart) {
      return res.status(404).json({ message: 'Abandoned cart not found' });
    }

    res.json({
      success: true,
      cart
    });
  } catch (error) {
    console.error('Error fetching abandoned cart details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;