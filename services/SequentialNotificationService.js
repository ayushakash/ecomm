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

      console.log(`🔍 [Sequential] Selecting merchant for item: ${item.productName}, variantLabel: ${item.variantLabel || 'none'}, qty: ${item.quantity}`);

      const smartMerchantResult = await smartMerchantSelection({
        orderId: orderId,
        productId: item.productId,
        variantLabel: item.variantLabel || null,
        customerLocation: orderData.deliveryLocation,
        maxDistance: 15,
        maxMerchants: 5,
        requiredQuantity: item.quantity || 1
      });

      if (!smartMerchantResult.success) {
        console.error('Smart merchant selection failed:', smartMerchantResult.error);
        return [];
      }

      const { rankedMerchants } = smartMerchantResult;
      console.log(`Starting sequential notifications for order ${orderId}, item ${itemId}: ${rankedMerchants.length} merchants`);

      const notificationKey = `${orderId}-${itemId}`;
      this.notificationQueue.set(notificationKey, {
        merchants: rankedMerchants,
        currentIndex: 0,
        orderData,
        item,
        startTime: new Date(),
        notifications: []
      });

      const firstNotification = await this.sendNotificationToNextMerchant(notificationKey);

      return firstNotification ? [firstNotification] : [];

    } catch (error) {
      console.error('Error in sendSequentialNotifications:', error);
      return [];
    }
  }

  /**
   * Send WhatsApp notification via n8n to the next merchant in queue
   */
  async sendNotificationToNextMerchant(notificationKey) {
    try {
      const queueData = this.notificationQueue.get(notificationKey);
      if (!queueData) {
        console.log(`No queue data found for ${notificationKey}`);
        return null;
      }

      const { merchants, currentIndex, orderData, item } = queueData;

      if (currentIndex >= merchants.length) {
        console.log(`All merchants exhausted for ${notificationKey}`);
        this.cleanupNotification(notificationKey);
        return null;
      }

      const currentMerchant = merchants[currentIndex];
      console.log(`Sending notification to merchant #${currentIndex + 1}: ${currentMerchant.name} (Score: ${currentMerchant.score})`);

      // Fetch merchant phone number
      const merchantDoc = await Merchant.findById(currentMerchant._id).select('phone contact');

      if (!merchantDoc) {
        console.log(`Merchant ${currentMerchant.name} not found in DB, skipping`);
        queueData.currentIndex++;
        return await this.sendNotificationToNextMerchant(notificationKey);
      }

      const merchantPhone = merchantDoc.phone || merchantDoc.contact?.phone || currentMerchant.phone;

      if (!merchantPhone) {
        console.log(`Merchant ${currentMerchant.name} has no phone number, skipping`);
        queueData.currentIndex++;
        return await this.sendNotificationToNextMerchant(notificationKey);
      }

      const notificationPayload = {
        eventType: 'order_created_smart',
        orderId: orderData._id,
        itemId: item._id,
        merchantData: {
          ...currentMerchant,
          phone: merchantPhone
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

      const n8nResult = await notificationService.sendToN8n(notificationPayload);
      console.log(`📲 WhatsApp sent to ${currentMerchant.name} (${merchantPhone}) via n8n`);

      // Track active notification for timeout/response handling
      this.activeNotifications.set(notificationKey, {
        merchantId: currentMerchant._id,
        merchantName: currentMerchant.name,
        startTime: new Date(),
        timeout: setTimeout(() => {
          this.handleNotificationTimeout(notificationKey);
        }, this.responseTimeout)
      });

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

      if (activeNotification.merchantId.toString() !== merchantId.toString()) {
        console.log(`Response from wrong merchant for ${notificationKey}`);
        return false;
      }

      console.log(`Merchant ${activeNotification.merchantName} ${action}ed order ${orderId}, item ${itemId}`);

      if (action === 'accept') {
        this.cleanupNotification(notificationKey);
        return true;
      } else if (action === 'reject') {
        if (activeNotification.timeout) {
          clearTimeout(activeNotification.timeout);
        }
        this.activeNotifications.delete(notificationKey);

        queueData.currentIndex++;

        setTimeout(async () => {
          await this.sendNotificationToNextMerchant(notificationKey);
        }, 2000);

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

      this.activeNotifications.delete(notificationKey);
      queueData.currentIndex++;

      await this.sendNotificationToNextMerchant(notificationKey);

    } catch (error) {
      console.error('Error handling notification timeout:', error);
    }
  }

  /**
   * Cleanup notification data
   */
  cleanupNotification(notificationKey) {
    try {
      const activeNotification = this.activeNotifications.get(notificationKey);
      if (activeNotification?.timeout) {
        clearTimeout(activeNotification.timeout);
      }

      this.activeNotifications.delete(notificationKey);

      const queueData = this.notificationQueue.get(notificationKey);
      if (queueData) {
        queueData.completedAt = new Date();
        queueData.isCompleted = true;

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
