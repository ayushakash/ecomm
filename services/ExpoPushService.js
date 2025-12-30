const { Expo } = require('expo-server-sdk');

class ExpoPushService {
  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional
      useFcmV1: true // Use FCM v1 API
    });
  }

  /**
   * Send push notification to multiple device tokens
   */
  async sendNotifications(notifications) {
    try {
      const messages = [];

      for (const notification of notifications) {
        const { deviceTokens, title, body, data = {}, badge = 1, sound = 'default' } = notification;

        // Validate device tokens
        const validTokens = deviceTokens.filter(token => {
          if (!Expo.isExpoPushToken(token)) {
            console.error('❌ Invalid Expo push token:', token);
            return false;
          }
          return true;
        });

        if (validTokens.length === 0) {
          console.log('⚠️ No valid device tokens found');
          continue;
        }

        // Create message for each valid token
        for (const token of validTokens) {
          messages.push({
            to: token,
            sound,
            title,
            body,
            data,
            badge,
            priority: 'high',
            channelId: 'order-notifications'
          });
        }
      }

      if (messages.length === 0) {
        return {
          success: false,
          error: 'No valid messages to send'
        };
      }

      console.log(`📤 Sending ${messages.length} push notifications...`);

      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log(`✅ Sent chunk of ${chunk.length} notifications`);
        } catch (error) {
          console.error('❌ Error sending notification chunk:', error);
        }
      }

      console.log(`📱 Total tickets received: ${tickets.length}`);

      // Handle receipts (optional - for tracking delivery)
      setTimeout(() => this.handleReceipts(tickets), 15000); // Check receipts after 15 seconds

      return {
        success: true,
        tickets,
        messagesSent: messages.length
      };

    } catch (error) {
      console.error('❌ Push notification service error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notification for new order
   */
  async sendOrderNotification({
    merchantData,
    orderData,
    smartData = {},
    itemData = {}
  }) {
    try {
      // Extract active device tokens
      const deviceTokens = merchantData.deviceTokens
        ?.filter(dt => dt.isActive && dt.token)
        ?.map(dt => dt.token) || [];

      if (deviceTokens.length === 0) {
        console.log('❌ No active device tokens for merchant:', merchantData.name);
        return {
          success: false,
          error: 'No active device tokens'
        };
      }

      console.log(`📱 Sending order notification to ${deviceTokens.length} devices`);

      const notification = {
        deviceTokens,
        title: '🛒 New Order Received!',
        body: this.createOrderNotificationBody(orderData, smartData, itemData),
        data: {
          type: 'new_order',
          orderId: orderData._id || orderData.orderId,
          itemId: itemData._id || itemData.itemId,
          orderNumber: orderData.orderNumber,
          distance: smartData.distance,
          score: smartData.score,
          rank: smartData.rank,
          isSequential: smartData.isSequential,
          timestamp: new Date().toISOString()
        },
        badge: 1,
        sound: 'default'
      };

      return await this.sendNotifications([notification]);

    } catch (error) {
      console.error('❌ Error sending order notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create notification body text
   */
  createOrderNotificationBody(orderData, smartData, itemData) {
    const orderNumber = orderData.orderNumber || 'N/A';
    const distance = smartData.distance ? `${smartData.distance.toFixed(1)}km away` : '';
    const rank = smartData.rank ? `(Priority #${smartData.rank})` : '';

    let body = `Order ${orderNumber}`;
    if (distance) body += ` • ${distance}`;
    if (rank) body += ` ${rank}`;

    // Add item info if available
    if (itemData.productName) {
      body += `\n${itemData.quantity || 1}x ${itemData.productName}`;
    }

    return body;
  }

  /**
   * Handle notification receipts (track delivery status)
   */
  async handleReceipts(tickets) {
    try {
      const receiptIds = tickets
        .filter(ticket => ticket.status === 'ok')
        .map(ticket => ticket.id);

      if (receiptIds.length === 0) return;

      console.log(`📋 Checking receipts for ${receiptIds.length} notifications...`);

      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

          for (const receiptId in receipts) {
            const receipt = receipts[receiptId];

            if (receipt.status === 'error') {
              console.error('❌ Notification delivery error:', receipt.message);

              // Handle specific errors
              if (receipt.details && receipt.details.error) {
                const errorCode = receipt.details.error;
                if (errorCode === 'DeviceNotRegistered') {
                  console.log('📱 Device token is invalid, should remove from database');
                  // TODO: Remove invalid token from merchant's deviceTokens
                }
              }
            } else if (receipt.status === 'ok') {
              console.log('✅ Notification delivered successfully:', receiptId);
            }
          }
        } catch (error) {
          console.error('❌ Error checking receipts:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error handling receipts:', error);
    }
  }

  /**
   * Validate if a token is a valid Expo push token
   */
  isValidToken(token) {
    return Expo.isExpoPushToken(token);
  }

  /**
   * Send test notification
   */
  async sendTestNotification(deviceToken) {
    try {
      const notification = {
        deviceTokens: [deviceToken],
        title: '🧪 Test Notification',
        body: 'This is a test notification from your e-commerce app!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };

      return await this.sendNotifications([notification]);
    } catch (error) {
      console.error('❌ Test notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ExpoPushService();