const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireMerchantOrAdmin } = require('../middleware/auth');
const SequentialNotificationService = require('../services/SequentialNotificationService');

const router = express.Router();

/**
 * Handle merchant response to sequential notification
 * POST /api/sequential-notifications/respond
 */
router.post('/respond', [
  verifyToken,
  requireMerchantOrAdmin,
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('itemId').notEmpty().withMessage('Item ID is required'),
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, itemId, action } = req.body;
    const merchantId = req.user._id;

    console.log(`Sequential notification response: ${action} from merchant ${merchantId} for order ${orderId}, item ${itemId}`);

    // Handle the response
    const handled = await SequentialNotificationService.handleMerchantResponse(
      orderId,
      itemId,
      merchantId,
      action
    );

    if (!handled) {
      return res.status(400).json({
        success: false,
        message: 'Response not processed - notification may have expired or been handled already'
      });
    }

    res.json({
      success: true,
      message: `Order ${action}ed successfully`,
      action: action,
      orderId: orderId,
      itemId: itemId
    });

  } catch (error) {
    console.error('Sequential notification response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing response'
    });
  }
});

/**
 * Get queue status (for debugging/admin)
 * GET /api/sequential-notifications/queue-status
 */
router.get('/queue-status', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const status = SequentialNotificationService.getQueueStatus();

    res.json({
      success: true,
      ...status,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting queue status'
    });
  }
});

/**
 * Cancel/stop sequential notification for an order item
 * POST /api/sequential-notifications/cancel
 */
router.post('/cancel', [
  verifyToken,
  requireMerchantOrAdmin,
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('itemId').notEmpty().withMessage('Item ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, itemId } = req.body;
    const notificationKey = `${orderId}-${itemId}`;

    // Only admin or system can cancel notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can cancel sequential notifications'
      });
    }

    SequentialNotificationService.cleanupNotification(notificationKey);

    res.json({
      success: true,
      message: 'Sequential notification cancelled successfully',
      orderId: orderId,
      itemId: itemId
    });

  } catch (error) {
    console.error('Cancel sequential notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling notification'
    });
  }
});

module.exports = router;