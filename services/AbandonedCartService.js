const AbandonedCart = require('../models/AbandonedCart');
const NotificationService = require('./NotificationService');
const notificationConfig = require('../config/notifications');

class AbandonedCartService {
  // Track cart activity. identity: { userId?, guestId? } — at least one set.
  // When both are present (guest just logged in), the guest cart is claimed
  // into the user's cart so markAsConverted(userId) finds it at order time.
  async trackCartActivity({ userId, guestId }, cartItems, userDetails) {
    try {
      const idClauses = [];
      if (userId) idClauses.push({ userId });
      if (guestId) idClauses.push({ guestId });
      const query = { isConverted: false, $or: idClauses };

      if (!cartItems || cartItems.length === 0) {
        // Remove abandoned cart(s) if cart is empty
        await AbandonedCart.deleteMany(query);
        return null;
      }

      const totalValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Find existing abandoned cart (matches either identity); a guest cart
      // found after login gets claimed so markAsConverted(userId) works later
      let abandonedCart = await AbandonedCart.findOne(query);
      if (abandonedCart && userId && !abandonedCart.userId) {
        abandonedCart.userId = userId;
      }

      if (abandonedCart) {
        // Update existing cart
        abandonedCart.cartItems = cartItems.map(item => ({
          ...item,
          addedAt: item.addedAt || new Date()
        }));
        abandonedCart.totalValue = totalValue;
        abandonedCart.lastActivity = new Date();
        if (userDetails) abandonedCart.userDetails = userDetails;
      } else {
        // Create new abandoned cart
        abandonedCart = new AbandonedCart({
          userId,
          guestId,
          cartItems: cartItems.map(item => ({
            ...item,
            addedAt: new Date()
          })),
          totalValue,
          lastActivity: new Date(),
          userDetails,
          notificationsSent: []
        });
      }

      await abandonedCart.save();

      // Schedule notifications only when we can actually reach the person
      if (abandonedCart.userDetails?.phone || abandonedCart.userDetails?.email) {
        this.scheduleNotifications(abandonedCart._id);
      }

      return abandonedCart;
    } catch (error) {
      console.error('Error tracking cart activity:', error);
      throw error;
    }
  }

  // Mark cart as converted
  async markAsConverted(userId, orderId) {
    try {
      const result = await AbandonedCart.updateOne(
        { userId, isConverted: false },
        {
          isConverted: true,
          convertedAt: new Date(),
          orderId
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error marking cart as converted:', error);
      throw error;
    }
  }

  // Schedule notifications for abandoned cart
  scheduleNotifications(cartId) {
    const notifications = notificationConfig.abandonedCart.notifications;

    Object.keys(notifications).forEach(type => {
      const config = notifications[type];
      if (!config.enabled) return;

      setTimeout(async () => {
        try {
          await this.sendAbandonedCartNotification(cartId, type);
        } catch (error) {
          console.error(`Error sending ${type} notification:`, error);
        }
      }, config.delay);
    });
  }

  // Send abandoned cart notification
  async sendAbandonedCartNotification(cartId, notificationType) {
    try {
      const cart = await AbandonedCart.findById(cartId)
        .populate('userId', 'name email phone')
        .populate('cartItems.productId', 'name price images')
        .populate('cartItems.merchantId', 'name');

      if (!cart || cart.isConverted) {
        return; // Cart was converted or doesn't exist
      }

      // Check if this notification type was already sent
      const alreadySent = cart.notificationsSent.some(
        notif => notif.type === notificationType
      );

      if (alreadySent) {
        return;
      }

      const config = notificationConfig.abandonedCart.notifications[notificationType];
      
      // Send to n8n
      const notifications = await NotificationService.sendAbandonedCartNotification(
        cart,
        notificationType
      );

      // Record notification
      cart.notificationsSent.push({
        type: notificationType,
        sentAt: new Date(),
        channel: 'n8n',
        success: notifications.length > 0 && notifications[0].success,
        messageId: notifications[0]?.messageId
      });

      await cart.save();

      return notifications;
    } catch (error) {
      console.error('Error sending abandoned cart notification:', error);
      throw error;
    }
  }

  // Get abandoned carts (Admin)
  async getAbandonedCarts(options = {}) {
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
      } = options;

      const filter = {};

      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (minValue !== undefined || maxValue !== undefined) {
        filter.totalValue = {};
        if (minValue !== undefined) filter.totalValue.$gte = minValue;
        if (maxValue !== undefined) filter.totalValue.$lte = maxValue;
      }

      if (isConverted !== undefined) {
        filter.isConverted = isConverted;
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const carts = await AbandonedCart.find(filter)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'name email phone')
        .populate('cartItems.productId', 'name price images')
        .populate('cartItems.merchantId', 'name')
        .populate('orderId', 'orderNumber totalAmount')
        .lean();

      const total = await AbandonedCart.countDocuments(filter);

      return {
        carts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCarts: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching abandoned carts:', error);
      throw error;
    }
  }

  // Get abandoned cart analytics
  async getAnalytics(options = {}) {
    try {
      const { startDate, endDate } = options;

      const matchFilter = {};
      if (startDate && endDate) {
        matchFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Overall stats
      const totalCarts = await AbandonedCart.countDocuments(matchFilter);
      const convertedCarts = await AbandonedCart.countDocuments({
        ...matchFilter,
        isConverted: true
      });
      
      const conversionRate = totalCarts > 0 ? (convertedCarts / totalCarts) * 100 : 0;

      // Value analytics
      const valueAnalytics = await AbandonedCart.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$totalValue' },
            avgValue: { $avg: '$totalValue' },
            maxValue: { $max: '$totalValue' },
            minValue: { $min: '$totalValue' }
          }
        }
      ]);

      // Conversion by value ranges
      const valueRangeAnalytics = await AbandonedCart.aggregate([
        { $match: matchFilter },
        {
          $bucket: {
            groupBy: '$totalValue',
            boundaries: [0, 500, 1000, 5000, 10000, 50000],
            default: '50000+',
            output: {
              count: { $sum: 1 },
              converted: {
                $sum: { $cond: ['$isConverted', 1, 0] }
              },
              avgValue: { $avg: '$totalValue' }
            }
          }
        }
      ]);

      // Timeline data
      const timelineData = await AbandonedCart.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            total: { $sum: 1 },
            converted: {
              $sum: { $cond: ['$isConverted', 1, 0] }
            },
            totalValue: { $sum: '$totalValue' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Notification effectiveness
      const notificationAnalytics = await AbandonedCart.aggregate([
        { $match: matchFilter },
        { $unwind: '$notificationsSent' },
        {
          $group: {
            _id: '$notificationsSent.type',
            sent: { $sum: 1 },
            successful: {
              $sum: { $cond: ['$notificationsSent.success', 1, 0] }
            }
          }
        }
      ]);

      // Most-added products across abandoned carts (which items people cart most)
      const topProducts = await AbandonedCart.aggregate([
        { $match: matchFilter },
        { $unwind: '$cartItems' },
        {
          $group: {
            _id: '$cartItems.productId',
            productName: { $last: '$cartItems.productName' },
            timesAdded: { $sum: 1 },
            totalQuantity: { $sum: '$cartItems.quantity' },
            totalValue: { $sum: { $multiply: ['$cartItems.price', '$cartItems.quantity'] } },
            uniqueCustomers: { $addToSet: { $ifNull: ['$userId', '$guestId'] } },
            convertedCount: { $sum: { $cond: ['$isConverted', 1, 0] } }
          }
        },
        {
          $project: {
            productName: 1,
            timesAdded: 1,
            totalQuantity: 1,
            totalValue: 1,
            convertedCount: 1,
            uniqueCustomers: { $size: '$uniqueCustomers' }
          }
        },
        { $sort: { timesAdded: -1 } },
        { $limit: 20 }
      ]);

      return {
        overview: {
          totalCarts,
          convertedCarts,
          conversionRate: Math.round(conversionRate * 100) / 100,
          abandonedValue: valueAnalytics[0]?.totalValue || 0,
          avgCartValue: valueAnalytics[0]?.avgValue || 0
        },
        valueRanges: valueRangeAnalytics,
        timeline: timelineData,
        notifications: notificationAnalytics,
        topProducts
      };
    } catch (error) {
      console.error('Error fetching abandoned cart analytics:', error);
      throw error;
    }
  }

  // Cleanup old abandoned carts
  async cleanup(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await AbandonedCart.deleteMany({
        lastActivity: { $lt: cutoffDate },
        isConverted: false
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up abandoned carts:', error);
      throw error;
    }
  }

  // Send manual notification to abandoned cart
  async sendManualNotification(cartId, message, channel = 'n8n') {
    try {
      const cart = await AbandonedCart.findById(cartId)
        .populate('userId', 'name email phone');

      if (!cart) {
        throw new Error('Cart not found');
      }

      let result;
      if (channel === 'n8n') {
        result = await NotificationService.sendToN8n({
          eventType: 'manual_abandoned_cart_notification',
          cartId: cart._id,
          userId: cart.userId,
          message: message,
          cartData: cart,
          timestamp: new Date()
        });
      }

      // Record notification
      cart.notificationsSent.push({
        type: 'manual',
        sentAt: new Date(),
        channel: channel,
        success: result?.success || false,
        messageId: result?.messageId
      });

      await cart.save();

      return result;
    } catch (error) {
      console.error('Error sending manual notification:', error);
      throw error;
    }
  }
}

module.exports = new AbandonedCartService();