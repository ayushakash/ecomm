const express = require('express');
const router = express.Router();
const OrderLogService = require('../services/OrderLogService');
const { verifyToken: auth, requireAdmin: adminAuth } = require('../middleware/auth');

// Get logs for a specific order
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      page = 1,
      limit = 50,
      eventType,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const result = await OrderLogService.getOrderLogs(orderId, {
      page: parseInt(page),
      limit: parseInt(limit),
      eventType,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching order logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all logs (Admin only)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      eventType,
      userId,
      userType,
      startDate,
      endDate,
      orderId,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const result = await OrderLogService.getAllLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      eventType,
      userId,
      userType,
      startDate,
      endDate,
      orderId,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching all logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get log analytics (Admin only)
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'eventType' } = req.query;

    const result = await OrderLogService.getLogAnalytics({
      startDate,
      endDate,
      groupBy
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching log analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Resend failed notification (Admin only)
router.post('/:logId/resend-notification', adminAuth, async (req, res) => {
  try {
    const { logId } = req.params;

    const notifications = await OrderLogService.resendNotification(logId);

    res.json({
      success: true,
      message: 'Notifications resent successfully',
      notifications
    });
  } catch (error) {
    console.error('Error resending notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get log details by ID
router.get('/:logId', auth, async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await OrderLog.findById(logId)
      .populate('orderId', 'orderNumber totalAmount customer')
      .populate('triggeredBy.userId', 'name email role')
      .lean();

    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Error fetching log details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get event types for filtering
router.get('/meta/event-types', auth, async (req, res) => {
  try {
    const eventTypes = [
      'order_created',
      'order_assigned', 
      'order_accepted',
      'order_rejected',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'payment_confirmed',
      'payment_failed',
      'stock_updated',
      'refund_initiated',
      'refund_completed'
    ];

    res.json({
      success: true,
      eventTypes
    });
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search logs (Admin only)
router.post('/search', adminAuth, async (req, res) => {
  try {
    const {
      query,
      eventTypes = [],
      dateRange,
      userTypes = [],
      page = 1,
      limit = 50
    } = req.body;

    const filter = {};

    // Add text search if query provided
    if (query) {
      filter.$or = [
        { eventDescription: { $regex: query, $options: 'i' } },
        { 'metadata.orderNumber': { $regex: query, $options: 'i' } },
        { 'triggeredBy.userName': { $regex: query, $options: 'i' } }
      ];
    }

    // Add event type filter
    if (eventTypes.length > 0) {
      filter.eventType = { $in: eventTypes };
    }

    // Add date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      filter.timestamp = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    // Add user type filter
    if (userTypes.length > 0) {
      filter['triggeredBy.userType'] = { $in: userTypes };
    }

    const OrderLog = require('../models/OrderLog');
    
    const logs = await OrderLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('orderId', 'orderNumber totalAmount customer')
      .populate('triggeredBy.userId', 'name email role')
      .lean();

    const total = await OrderLog.countDocuments(filter);

    res.json({
      success: true,
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error searching logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;