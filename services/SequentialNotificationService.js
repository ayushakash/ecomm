const notificationService = require('./NotificationService');
const Merchant = require('../models/Merchant');

class SequentialNotificationService {
  constructor() {
    this.activeNotifications = new Map(); // Track active notifications by orderId-itemId
    this.notificationQueue = new Map(); // Queue of merchants waiting for responses
    this.responseTimeout = 5 * 60 * 1000; // 5 minutes timeout
  }

  /**
   * Process smart order creation with sequential notifications
   */
  async processSmartOrderSequential(eventData) {
    const notifications = [];

    try {
      // Process each item in the order
      for (const item of eventData.orderData.items || []) {
        const sequentialResult = await this.sendSequentialNotifications({
          orderId: eventData.orderData._id,
          itemId: item._id,
          orderData: eventData.orderData,
          item: item
        });

        notifications.push(...sequentialResult);
      }
    } catch (error) {
      console.error('Error in sequential order processing:', error);
    }

    return notifications;
  }

  /**
   * Send notifications to merchants sequentially (one by one)
   */
  async sendSequentialNotifications({ orderId, itemId, orderData, item }) {
    try {
      const { smartMerchantSelection } = require('../utils/geoUtils');

      // Get ranked merchants for this item
      const smartMerchantResult = await smartMerchantSelection({
        orderId: orderId,
        productId: item.productId,
        customerLocation: orderData.deliveryLocation,
        maxDistance: 15,
        maxMerchants: 5, // Get more merchants for sequential processing
        requiredQuantity: item.quantity || 1
      });

      if (!smartMerchantResult.success) {
        console.error('Smart merchant selection failed:', smartMerchantResult.error);
        return [];
      }

      const { rankedMerchants } = smartMerchantResult;
      console.log(`Starting sequential notifications for order ${orderId}, item ${itemId}:`, rankedMerchants.length, 'merchants');

      // Create notification queue
      const notificationKey = `${orderId}-${itemId}`;
      this.notificationQueue.set(notificationKey, {
        merchants: rankedMerchants,
        currentIndex: 0,
        orderData,
        item,
        startTime: new Date(),
        notifications: []
      });

      // Start with the first (highest ranked) merchant
      const firstNotification = await this.sendNotificationToNextMerchant(notificationKey);

      return firstNotification ? [firstNotification] : [];

    } catch (error) {
      console.error('Error in sendSequentialNotifications:', error);
      return [];
    }
  }

  /**
   * Send notification to the next merchant in queue
   */
  async sendNotificationToNextMerchant(notificationKey) {
    try {
      const queueData = this.notificationQueue.get(notificationKey);
      if (!queueData) {
        console.log(`No queue data found for ${notificationKey}`);
        return null;
      }

      const { merchants, currentIndex, orderData, item } = queueData;

      // Check if we've exhausted all merchants
      if (currentIndex >= merchants.length) {
        console.log(`All merchants exhausted for ${notificationKey}`);
        this.cleanupNotification(notificationKey);
        return null;
      }

      const currentMerchant = merchants[currentIndex];
      console.log(`Sending notification to merchant #${currentIndex + 1}: ${currentMerchant.name} (Score: ${currentMerchant.score})`);

      // Get merchant's active device tokens
      const merchantWithTokens = await Merchant.findById(currentMerchant._id)
        .select('deviceTokens notificationSettings');

      if (!merchantWithTokens || !this.canSendNotification(merchantWithTokens)) {
        console.log(`Merchant ${currentMerchant.name} not available for notifications, skipping`);
        // Skip to next merchant
        queueData.currentIndex++;
        return await this.sendNotificationToNextMerchant(notificationKey);
      }

      // Create notification payload
      const notificationPayload = {
        eventType: 'order_created_smart',
        orderId: orderData._id,
        itemId: item._id,
        merchantData: {
          ...currentMerchant,
          deviceTokens: merchantWithTokens.deviceTokens.filter(dt => dt.isActive)
        },
        customerLocation: orderData.deliveryLocation,
        orderData: orderData,
        smartData: {
          distance: currentMerchant.distance,
          score: currentMerchant.score,
          priority: currentMerchant.priority,
          rank: currentIndex + 1,
          totalMerchants: merchants.length,
          isSequential: true
        },
        sequentialData: {
          notificationKey,
          timeoutMinutes: 5,
          isFirstChoice: currentIndex === 0
        }
      };

      // Send push notification via n8n
      const n8nResult = await notificationService.sendToN8n(notificationPayload);

      // Track the active notification
      this.activeNotifications.set(notificationKey, {
        merchantId: currentMerchant._id,
        merchantName: currentMerchant.name,
        startTime: new Date(),
        timeout: setTimeout(() => {
          this.handleNotificationTimeout(notificationKey);
        }, this.responseTimeout)
      });

      // Store notification result
      queueData.notifications.push({
        merchantId: currentMerchant._id,
        merchantName: currentMerchant.name,
        rank: currentIndex + 1,
        score: currentMerchant.score,
        distance: currentMerchant.distance,
        sentAt: new Date(),
        ...n8nResult
      });

      return {
        channel: 'n8n-sequential',
        merchantId: currentMerchant._id,
        merchantName: currentMerchant.name,
        rank: currentIndex + 1,
        totalMerchants: merchants.length,
        score: currentMerchant.score,
        distance: currentMerchant.distance,
        ...n8nResult
      };

    } catch (error) {
      console.error('Error sending notification to next merchant:', error);
      return null;
    }
  }

  /**
   * Handle merchant response (accept/reject)
   */
  async handleMerchantResponse(orderId, itemId, merchantId, action) {
    const notificationKey = `${orderId}-${itemId}`;

    try {
      const activeNotification = this.activeNotifications.get(notificationKey);
      const queueData = this.notificationQueue.get(notificationKey);

      if (!activeNotification || !queueData) {
        console.log(`No active notification found for ${notificationKey}`);
        return false;
      }

      // Verify this response is from the current merchant
      if (activeNotification.merchantId.toString() !== merchantId.toString()) {
        console.log(`Response from wrong merchant for ${notificationKey}`);
        return false;
      }

      console.log(`Merchant ${activeNotification.merchantName} ${action}ed order ${orderId}, item ${itemId}`);

      if (action === 'accept') {
        // Merchant accepted - stop the sequential process
        console.log(`Order ${orderId}, item ${itemId} accepted by ${activeNotification.merchantName}`);
        this.cleanupNotification(notificationKey);
        return true;
      } else if (action === 'reject') {
        // Merchant rejected - move to next merchant
        console.log(`Order ${orderId}, item ${itemId} rejected by ${activeNotification.merchantName}`);

        // Clear current notification
        if (activeNotification.timeout) {
          clearTimeout(activeNotification.timeout);
        }
        this.activeNotifications.delete(notificationKey);

        // Move to next merchant
        queueData.currentIndex++;

        // Send to next merchant after a small delay
        setTimeout(async () => {
          await this.sendNotificationToNextMerchant(notificationKey);
        }, 2000); // 2 second delay between notifications

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error handling merchant response:', error);
      return false;
    }
  }

  /**
   * Handle notification timeout (no response from merchant)
   */
  async handleNotificationTimeout(notificationKey) {
    try {
      console.log(`Notification timeout for ${notificationKey}`);

      const queueData = this.notificationQueue.get(notificationKey);
      if (!queueData) return;

      // Clear active notification
      this.activeNotifications.delete(notificationKey);

      // Move to next merchant
      queueData.currentIndex++;

      // Send to next merchant
      await this.sendNotificationToNextMerchant(notificationKey);

    } catch (error) {
      console.error('Error handling notification timeout:', error);
    }
  }

  /**
   * Check if merchant can receive notifications
   */
  canSendNotification(merchant) {
    // Check if push notifications are enabled
    if (!merchant.notificationSettings?.pushEnabled || !merchant.notificationSettings?.newOrders) {
      return false;
    }

    // Check if merchant has active device tokens
    const hasActiveTokens = merchant.deviceTokens?.some(dt => dt.isActive && dt.token);
    if (!hasActiveTokens) {
      return false;
    }

    // Check quiet hours if enabled
    if (merchant.notificationSettings?.quietHoursEnabled) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const quietStart = merchant.notificationSettings.quietHoursStart;
      const quietEnd = merchant.notificationSettings.quietHoursEnd;

      if (this.isTimeInQuietHours(currentTime, quietStart, quietEnd)) {
        console.log(`Merchant in quiet hours: ${quietStart} - ${quietEnd}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  isTimeInQuietHours(currentTime, startTime, endTime) {
    if (!startTime || !endTime) return false;

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      // Same day range
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Crosses midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /**
   * Cleanup notification data
   */
  cleanupNotification(notificationKey) {
    try {
      // Clear timeout
      const activeNotification = this.activeNotifications.get(notificationKey);
      if (activeNotification?.timeout) {
        clearTimeout(activeNotification.timeout);
      }

      // Remove from active notifications
      this.activeNotifications.delete(notificationKey);

      // Keep queue data for analytics but mark as completed
      const queueData = this.notificationQueue.get(notificationKey);
      if (queueData) {
        queueData.completedAt = new Date();
        queueData.isCompleted = true;

        // Remove completed notifications after 1 hour
        setTimeout(() => {
          this.notificationQueue.delete(notificationKey);
        }, 60 * 60 * 1000);
      }

      console.log(`Cleaned up notification ${notificationKey}`);
    } catch (error) {
      console.error('Error cleaning up notification:', error);
    }
  }

  /**
   * Get notification queue status (for debugging)
   */
  getQueueStatus() {
    return {
      activeNotifications: Array.from(this.activeNotifications.keys()),
      queuedNotifications: Array.from(this.notificationQueue.keys()),
      queueDetails: Array.from(this.notificationQueue.entries()).map(([key, data]) => ({
        key,
        currentIndex: data.currentIndex,
        totalMerchants: data.merchants.length,
        startTime: data.startTime,
        isCompleted: data.isCompleted || false
      }))
    };
  }
}

module.exports = new SequentialNotificationService();