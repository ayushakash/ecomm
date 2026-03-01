const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Merchant = require('../models/Merchant');
const SequentialNotificationService = require('../services/SequentialNotificationService');
const NotificationService = require('../services/NotificationService');

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

// Middleware to verify webhook secret
const verifyWebhookSecret = (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];

  if (!secret || secret !== WEBHOOK_SECRET) {
    console.warn('Invalid webhook secret received');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

/**
 * @route   POST /api/webhooks/merchant-response
 * @desc    Handle merchant accept/reject from WhatsApp buttons (via n8n)
 * @access  Webhook (with secret)
 */
router.post('/merchant-response', verifyWebhookSecret, async (req, res) => {
  try {
    const { action, orderId, itemId, merchantPhone } = req.body;

    console.log('📥 Merchant response received:', { action, orderId, itemId, merchantPhone });

    if (!action || !orderId || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, orderId, itemId'
      });
    }

    // Validate action
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "accept" or "reject"'
      });
    }

    // Find merchant by phone
    const merchant = await Merchant.findOne({ phone: merchantPhone });
    if (!merchant) {
      console.error('Merchant not found for phone:', merchantPhone);
      return res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Find the specific item in the order
    const item = order.items.find(i => i._id.toString() === itemId);
    if (!item) {
      console.error('Item not found in order:', itemId);
      return res.status(404).json({
        success: false,
        error: 'Item not found in order'
      });
    }

    // Handle the merchant response using SequentialNotificationService
    const handled = await SequentialNotificationService.handleMerchantResponse(
      orderId,
      itemId,
      merchant._id,
      action
    );

    if (action === 'accept') {
      // Update item status to assigned
      item.itemStatus = 'assigned';
      item.assignedMerchant = merchant._id;
      item.assignedAt = new Date();
      await order.save();

      console.log(`✅ Order ${orderId} item ${itemId} accepted by merchant ${merchant.name}`);

      // Send notification to n8n for order_assigned event
      await NotificationService.processOrderEvent('order_assigned', {
        orderData: {
          _id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.deliveryAddress?.fullAddress || order.customerAddress,
          items: order.items
        },
        metadata: {
          merchantId: merchant._id,
          itemId: itemId,
          assignedBy: 'whatsapp_button'
        },
        triggeredBy: {
          userId: merchant._id,
          userType: 'merchant',
          userName: merchant.name || merchant.businessName,
          userPhone: merchant.phone,
          userEmail: merchant.email
        }
      });

      return res.json({
        success: true,
        message: 'Order accepted successfully',
        data: {
          orderId,
          itemId,
          merchantId: merchant._id,
          merchantName: merchant.name
        }
      });

    } else {
      // Reject - the SequentialNotificationService will handle moving to next merchant
      console.log(`❌ Order ${orderId} item ${itemId} rejected by merchant ${merchant.name}`);

      return res.json({
        success: true,
        message: 'Order rejected, notifying next merchant',
        data: {
          orderId,
          itemId,
          merchantId: merchant._id
        }
      });
    }

  } catch (error) {
    console.error('❌ Error handling merchant response:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/webhooks/msg91-whatsapp
 * @desc    Handle MSG91 WhatsApp callbacks (button clicks, message status)
 * @access  Webhook
 */
router.post('/msg91-whatsapp', async (req, res) => {
  try {
    const payload = req.body;

    console.log('📥 MSG91 WhatsApp callback received:', JSON.stringify(payload, null, 2));

    // MSG91 sends different types of callbacks
    const eventType = payload.type || payload.event || 'unknown';

    switch (eventType) {
      case 'button_clicked':
      case 'interactive_reply':
        // Parse button payload
        const buttonPayload = payload.button?.payload || payload.interactive?.button_reply?.id || '';
        const parts = buttonPayload.split('_');

        if (parts.length >= 3) {
          const action = parts[0].toLowerCase();
          const orderId = parts[1];
          const itemId = parts[2];
          const merchantPhone = (payload.from || payload.sender || '').replace(/^91/, '');

          console.log(`🔘 Button clicked: ${action} for order ${orderId}, item ${itemId}`);

          // Forward to merchant-response endpoint
          const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/merchant-response`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-webhook-secret': WEBHOOK_SECRET
            },
            body: JSON.stringify({
              action,
              orderId,
              itemId,
              merchantPhone
            })
          });

          const result = await response.json();
          return res.json(result);
        }
        break;

      case 'message_delivered':
      case 'message_read':
        console.log(`📨 Message ${eventType}:`, payload.messageId);
        break;

      case 'message_failed':
        console.error('❌ Message failed:', payload);
        break;

      default:
        console.log('📥 Unknown MSG91 event:', eventType);
    }

    res.json({ success: true, message: 'Callback received' });

  } catch (error) {
    console.error('❌ Error handling MSG91 callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/webhooks/merchant-order-action
 * @desc    Handle merchant accept/reject via URL buttons (fallback method)
 * @access  Public (with token verification)
 */
router.get('/merchant-order-action', async (req, res) => {
  try {
    let { action, orderId, itemId, token, merchantId, data } = req.query;

    // Support single encoded 'data' param for WhatsApp button URLs
    // data = base64(orderId:itemId:merchantId)
    if (data && !orderId) {
      try {
        const decoded = Buffer.from(data, 'base64').toString('utf-8');
        const parts = decoded.split(':');
        if (parts.length === 3) {
          orderId = parts[0];
          itemId = parts[1];
          merchantId = parts[2];
          token = data; // data itself serves as the token
        }
      } catch (e) {
        console.error('Failed to decode data param:', e.message);
      }
    }

    console.log('📥 Merchant URL action received:', { action, orderId, itemId, merchantId });

    // Validate required params
    if (!action || !orderId || !itemId || !merchantId) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #e74c3c;">Invalid Request</h1>
            <p>Missing required parameters.</p>
          </body>
        </html>
      `);
    }

    // Verify token (simple verification - in production use JWT or signed tokens)
    const expectedToken = Buffer.from(`${orderId}:${itemId}:${merchantId}`).toString('base64');
    if (token !== expectedToken && data !== expectedToken) {
      return res.status(401).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #e74c3c;">Unauthorized</h1>
            <p>Invalid or expired link.</p>
          </body>
        </html>
      `);
    }

    // Find merchant
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #e74c3c;">Not Found</h1>
            <p>Merchant not found.</p>
          </body>
        </html>
      `);
    }

    // Handle the action
    const handled = await SequentialNotificationService.handleMerchantResponse(
      orderId,
      itemId,
      merchant._id,
      action
    );

    if (action === 'accept') {
      // Update order item
      const order = await Order.findById(orderId);
      if (order) {
        const item = order.items.find(i => i._id.toString() === itemId);
        if (item) {
          item.itemStatus = 'assigned';
          item.assignedMerchant = merchant._id;
          item.assignedAt = new Date();
          await order.save();
        }
      }

      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #e8f5e9;">
            <h1 style="color: #27ae60;">Order Accepted!</h1>
            <p>You have successfully accepted the order.</p>
            <p>Customer details have been sent to your WhatsApp.</p>
            <p style="margin-top: 30px;">
              <a href="/" style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Go to Dashboard
              </a>
            </p>
          </body>
        </html>
      `);
    } else {
      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffebee;">
            <h1 style="color: #e74c3c;">Order Rejected</h1>
            <p>You have declined this order.</p>
            <p>The order will be offered to the next available merchant.</p>
            <p style="margin-top: 30px;">
              <a href="/" style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Go to Dashboard
              </a>
            </p>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error('❌ Error handling URL action:', error);
    return res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #e74c3c;">Error</h1>
          <p>Something went wrong. Please try again.</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;
