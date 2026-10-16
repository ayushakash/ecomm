const { Expo } = require('expo-server-sdk');

// Android channels created by the mobile app (mobile-app/src/services/notifications.ts).
const CHANNELS = {
  ORDERS: 'orders',
  OFFERS: 'offers',
  // Merchant app channel (pre-existing).
  MERCHANT_ORDERS: 'order-notifications'
};

const RECEIPT_DELAY_MS = 15000;

class ExpoPushService {
  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional (only if push security is enabled on Expo)
      useFcmV1: true
    });
    this.CHANNELS = CHANNELS;
  }

  /**
   * Send push notifications.
   * @param {Array<{deviceTokens: string[], title: string, body: string, data?: object,
   *   badge?: number, sound?: string, channelId?: string}>} notifications
   * @returns {{success: boolean, messagesSent?: number, failed?: number, tickets?: object[], error?: string}}
   */
  async sendNotifications(notifications) {
    try {
      const messages = [];

      for (const notification of notifications) {
        const {
          deviceTokens,
          title,
          body,
          data = {},
          badge,
          sound = 'default',
          channelId = CHANNELS.MERCHANT_ORDERS
        } = notification;

        for (const token of new Set(deviceTokens)) {
          if (!Expo.isExpoPushToken(token)) {
            console.error('❌ Invalid Expo push token:', token);
            continue;
          }
          messages.push({ to: token, sound, title, body, data, badge, priority: 'high', channelId });
        }
      }

      if (messages.length === 0) {
        return { success: false, error: 'No valid messages to send', messagesSent: 0, failed: 0 };
      }

      // tickets[i] belongs to sentMessages[i]; a failed chunk contributes no tickets.
      const tickets = [];
      const sentMessages = [];
      for (const chunk of this.expo.chunkPushNotifications(messages)) {
        try {
          tickets.push(...(await this.expo.sendPushNotificationsAsync(chunk)));
          sentMessages.push(...chunk);
        } catch (error) {
          console.error('❌ Error sending notification chunk:', error);
        }
      }

      const deadTokens = [];
      const receiptTokens = new Map();
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') receiptTokens.set(ticket.id, sentMessages[i].to);
        else if (ticket.details?.error === 'DeviceNotRegistered') deadTokens.push(sentMessages[i].to);
        else console.error('❌ Push ticket error:', ticket.message);
      });
      if (deadTokens.length) await this.removeTokens(deadTokens);
      if (receiptTokens.size) setTimeout(() => this.handleReceipts(receiptTokens), RECEIPT_DELAY_MS);

      const ok = receiptTokens.size;
      console.log(`📤 Push: ${ok}/${messages.length} accepted by Expo`);
      return { success: ok > 0, messagesSent: ok, failed: messages.length - ok, tickets };
    } catch (error) {
      console.error('❌ Push notification service error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Push to customers by User id.
   * `url` is a chardeevari:// deep link the app opens when the notification is tapped.
   */
  async sendToUsers(userIds, { title, body, url, channelId = CHANNELS.ORDERS, data = {} }) {
    const PushDevice = require('../models/PushDevice');
    const devices = await PushDevice.find({ user: { $in: userIds } }).select('token').lean();
    const deviceTokens = devices.map(d => d.token);
    if (deviceTokens.length === 0) {
      return { success: false, error: 'No registered devices', messagesSent: 0, failed: 0 };
    }
    return this.sendNotifications([{ deviceTokens, title, body, channelId, data: { ...data, ...(url && { url }) } }]);
  }

  /** Drop tokens Expo reports as uninstalled/expired from customers and merchants. */
  async removeTokens(tokens) {
    const PushDevice = require('../models/PushDevice');
    const Merchant = require('../models/Merchant');
    try {
      await Promise.all([
        PushDevice.deleteMany({ token: { $in: tokens } }),
        Merchant.updateMany({ 'deviceTokens.token': { $in: tokens } }, { $pull: { deviceTokens: { token: { $in: tokens } } } })
      ]);
      console.log(`🧹 Removed ${tokens.length} unregistered push token(s)`);
    } catch (error) {
      console.error('❌ Failed to remove push tokens:', error);
    }
  }

  /**
   * Send notification for new order (merchant app)
   */
  async sendOrderNotification({
    merchantData,
    orderData,
    smartData = {},
    itemData = {}
  }) {
    try {
      const deviceTokens = merchantData.deviceTokens
        ?.filter(dt => dt.isActive && dt.token)
        ?.map(dt => dt.token) || [];

      if (deviceTokens.length === 0) {
        return { success: false, error: 'No active device tokens' };
      }

      return await this.sendNotifications([{
        deviceTokens,
        title: '🛒 New Order Received!',
        body: this.createOrderNotificationBody(orderData, smartData, itemData),
        channelId: CHANNELS.MERCHANT_ORDERS,
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
        badge: 1
      }]);
    } catch (error) {
      console.error('❌ Error sending order notification:', error);
      return { success: false, error: error.message };
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

    if (itemData.productName) {
      body += `\n${itemData.quantity || 1}x ${itemData.productName}`;
    }

    return body;
  }

  /**
   * Check delivery receipts; prune tokens whose device is no longer registered.
   * @param {Map<string, string>} receiptTokens receipt id → push token
   */
  async handleReceipts(receiptTokens) {
    const deadTokens = [];
    for (const chunk of this.expo.chunkPushNotificationReceiptIds([...receiptTokens.keys()])) {
      try {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
        for (const [id, receipt] of Object.entries(receipts)) {
          if (receipt.status !== 'error') continue;
          if (receipt.details?.error === 'DeviceNotRegistered') deadTokens.push(receiptTokens.get(id));
          else console.error('❌ Notification delivery error:', receipt.details?.error, receipt.message);
        }
      } catch (error) {
        console.error('❌ Error checking receipts:', error);
      }
    }
    if (deadTokens.length) await this.removeTokens(deadTokens);
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
    return this.sendNotifications([{
      deviceTokens: [deviceToken],
      title: '🧪 Test Notification',
      body: 'This is a test notification from your e-commerce app!',
      data: { type: 'test', timestamp: new Date().toISOString() }
    }]);
  }
}

module.exports = new ExpoPushService();
