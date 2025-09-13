const Order = require('../models/Order');
const NotificationService = require('./NotificationService');

class OrderLogService {
  // Add lifecycle event to order (single object approach)
  async addLifecycleEvent(orderId, eventType, triggeredBy, metadata = {}, eventDescription = '') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const lifecycleEvent = {
        eventType,
        timestamp: new Date(),
        triggeredBy,
        metadata,
        eventDescription,
        notificationSent: {
          n8n: { sent: false }
        }
      };

      // Add to lifecycle array
      order.lifecycle.push(lifecycleEvent);
      await order.save();

      // Send notifications
      const eventData = {
        orderId: order._id,
        orderData: order,
        timestamp: lifecycleEvent.timestamp,
        triggeredBy,
        metadata
      };

      const notifications = await NotificationService.processOrderEvent(eventType, eventData);

      // Update notification status in the lifecycle event
      const lastEvent = order.lifecycle[order.lifecycle.length - 1];
      if (notifications.length > 0) {
        const n8nNotification = notifications.find(n => n.channel === 'n8n');
        if (n8nNotification) {
          lastEvent.notificationSent.n8n = {
            sent: n8nNotification.success,
            sentAt: n8nNotification.success ? new Date() : undefined,
            response: n8nNotification.response,
            error: n8nNotification.success ? undefined : n8nNotification.error
          };
        }
      }

      await order.save();
      return lastEvent;
    } catch (error) {
      console.error('Error adding lifecycle event:', error);
      throw error;
    }
  }

  // Process notifications for the log event
  async processNotifications(log, eventData) {
    try {
      // Prepare notification data
      const notificationData = {
        eventType: log.eventType,
        orderId: log.orderId,
        orderData: eventData.orderData,
        timestamp: log.timestamp,
        triggeredBy: log.triggeredBy,
        recipients: eventData.recipients || {},
        metadata: log.metadata,
        requestBody: log.requestBody
      };

      // Send notifications via NotificationService
      const notifications = await NotificationService.processOrderEvent(
        log.eventType, 
        notificationData
      );

      // Update log with notification results
      const updateData = {};
      for (const notification of notifications) {
        if (notification.channel === 'n8n') {
          updateData['notificationSent.n8n'] = {
            sent: notification.success,
            sentAt: notification.success ? new Date() : undefined,
            response: notification.response,
            error: notification.success ? undefined : notification.error
          };
        }
      }

      if (Object.keys(updateData).length > 0) {
        await OrderLog.findByIdAndUpdate(log._id, updateData);
      }

      return notifications;
    } catch (error) {
      console.error('Error processing notifications:', error);
      
      // Update log with error
      await OrderLog.findByIdAndUpdate(log._id, {
        'notificationSent.n8n.error': error.message
      });
    }
  }

  // Get logs for a specific order
  async getOrderLogs(orderId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        eventType,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const filter = { orderId };
      if (eventType) {
        filter.eventType = eventType;
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const logs = await OrderLog.find(filter)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('triggeredBy.userId', 'name email role')
        .lean();

      const total = await OrderLog.countDocuments(filter);

      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching order logs:', error);
      throw error;
    }
  }

  // Get all logs with filters (Admin)
  async getAllLogs(options = {}) {
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
      } = options;

      const filter = {};
      
      if (eventType) filter.eventType = eventType;
      if (orderId) filter.orderId = orderId;
      if (userId) filter['triggeredBy.userId'] = userId;
      if (userType) filter['triggeredBy.userType'] = userType;
      
      if (startDate && endDate) {
        filter.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const logs = await OrderLog.find(filter)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('orderId', 'orderNumber totalAmount customer')
        .populate('triggeredBy.userId', 'name email role')
        .lean();

      const total = await OrderLog.countDocuments(filter);

      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching all logs:', error);
      throw error;
    }
  }

  // Get log analytics
  async getLogAnalytics(options = {}) {
    try {
      const { startDate, endDate, groupBy = 'eventType' } = options;

      const matchFilter = {};
      if (startDate && endDate) {
        matchFilter.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: `$${groupBy}`,
            count: { $sum: 1 },
            successfulNotifications: {
              $sum: {
                $cond: [{ $eq: ['$notificationSent.n8n.sent', true] }, 1, 0]
              }
            },
            failedNotifications: {
              $sum: {
                $cond: [{ $eq: ['$notificationSent.n8n.sent', false] }, 1, 0]
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ];

      const analytics = await OrderLog.aggregate(pipeline);

      // Get timeline data (last 7 days)
      const timelineData = await OrderLog.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp'
              }
            },
            count: { $sum: 1 },
            events: { $push: '$eventType' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        analytics,
        timeline: timelineData
      };
    } catch (error) {
      console.error('Error fetching log analytics:', error);
      throw error;
    }
  }

  // Resend failed notification
  async resendNotification(logId) {
    try {
      const log = await OrderLog.findById(logId);
      if (!log) {
        throw new Error('Log not found');
      }

      // Prepare notification data
      const notificationData = {
        eventType: log.eventType,
        orderId: log.orderId,
        timestamp: log.timestamp,
        triggeredBy: log.triggeredBy,
        metadata: log.metadata,
        requestBody: log.requestBody
      };

      // Resend notifications
      const notifications = await NotificationService.processOrderEvent(
        log.eventType,
        notificationData
      );

      // Update log with new notification results
      const updateData = {};
      for (const notification of notifications) {
        if (notification.channel === 'n8n') {
          updateData['notificationSent.n8n'] = {
            sent: notification.success,
            sentAt: notification.success ? new Date() : undefined,
            response: notification.response,
            error: notification.success ? undefined : notification.error
          };
        }
      }

      await OrderLog.findByIdAndUpdate(logId, updateData);

      return notifications;
    } catch (error) {
      console.error('Error resending notification:', error);
      throw error;
    }
  }

  // Helper method to log order events (using single order object)
  async logOrderEvent(eventType, orderData, triggeredBy, req, additionalData = {}) {
    const metadata = {
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount,
      merchantId: orderData.merchant,
      customerId: orderData.customer,
      requestBody: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      ...additionalData.metadata
    };

    const eventDescription = this.getEventDescription(eventType, orderData);

    const triggeredByData = {
      userId: triggeredBy.userId,
      userType: triggeredBy.userType,
      userName: triggeredBy.userName || triggeredBy.merchantName,
      userEmail: triggeredBy.userEmail || triggeredBy.merchantEmail,
      userPhone: triggeredBy.userPhone || triggeredBy.merchantPhone
    };

    return await this.addLifecycleEvent(
      orderData._id,
      eventType,
      triggeredByData,
      metadata,
      eventDescription
    );
  }

  // Get event description based on event type
  getEventDescription(eventType, orderData) {
    const descriptions = {
      order_created: `Order ${orderData.orderNumber} was created`,
      order_assigned: `Order ${orderData.orderNumber} was assigned to merchant`,
      order_accepted: `Order ${orderData.orderNumber} was accepted by merchant`,
      order_rejected: `Order ${orderData.orderNumber} was rejected by merchant`,
      order_shipped: `Order ${orderData.orderNumber} has been shipped`,
      order_delivered: `Order ${orderData.orderNumber} has been delivered`,
      order_cancelled: `Order ${orderData.orderNumber} was cancelled`,
      payment_confirmed: `Payment confirmed for order ${orderData.orderNumber}`,
      payment_failed: `Payment failed for order ${orderData.orderNumber}`,
      stock_updated: `Stock updated for order ${orderData.orderNumber}`,
      refund_initiated: `Refund initiated for order ${orderData.orderNumber}`,
      refund_completed: `Refund completed for order ${orderData.orderNumber}`
    };

    return descriptions[eventType] || `Order ${orderData.orderNumber} - ${eventType}`;
  }
}

module.exports = new OrderLogService();