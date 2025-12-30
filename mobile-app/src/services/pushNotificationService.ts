import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationAction {
  id: 'accept' | 'reject';
  title: string;
}

interface OrderNotificationData {
  type: 'new_order';
  orderId: string;
  itemId: string;
  priority: 'high' | 'medium' | 'low';
  customerName: string;
  amount: string;
  distance: string;
  score: string;
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private deviceId: string | null = null;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we're in Expo Go (not supported)
      const Constants = require('expo-constants');
      if (Constants.appOwnership === 'expo' || !Constants.appOwnership) {
        console.warn('Push notifications not supported in Expo Go');
        return false;
      }

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Get device ID
      this.deviceId = await this.getDeviceId();

      // Register for notifications
      const token = await this.registerForPushNotifications();
      if (!token) {
        console.error('Failed to get push token');
        return false;
      }

      this.expoPushToken = token;

      // Store token locally
      await AsyncStorage.setItem('expoPushToken', token);

      // Register device token with backend
      await this.registerDeviceToken(token);

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('Push notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we're in Expo Go first
      const Constants = require('expo-constants');
      if (Constants.appOwnership === 'expo' || !Constants.appOwnership) {
        console.warn('Skipping push notification registration in Expo Go');
        return null;
      }

      // Check existing permissions
      let { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || undefined,
      });

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order-notifications', {
          name: 'Order Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up notification categories with actions
   */
  private async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync('order_actions', [
        {
          identifier: 'accept',
          buttonTitle: '✅ Accept Order',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'reject',
          buttonTitle: '❌ Reject',
          options: { opensAppToForeground: false },
        },
      ]);
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners() {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tapped (app opened from notification)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as OrderNotificationData;
      const actionId = response.actionIdentifier;

      console.log('Notification response:', { actionId, data });

      if (data.type === 'new_order') {
        await this.handleOrderNotificationAction(actionId, data);
      }
    });
  }

  /**
   * Handle order notification actions
   */
  private async handleOrderNotificationAction(
    actionId: string,
    data: OrderNotificationData
  ) {
    try {
      if (actionId === 'accept') {
        // For sequential notifications, use the sequential response API
        await api.post('/sequential-notifications/respond', {
          orderId: data.orderId,
          itemId: data.itemId,
          action: 'accept'
        });

        // Navigate to orders screen
        this.navigateToOrders();

        console.log('Order accepted from sequential notification');
      } else if (actionId === 'reject') {
        // For sequential notifications, use the sequential response API
        await api.post('/sequential-notifications/respond', {
          orderId: data.orderId,
          itemId: data.itemId,
          action: 'reject'
        });

        console.log('Order rejected from sequential notification');
      } else if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // Notification body tapped - just navigate to orders
        this.navigateToOrders();
      }
    } catch (error) {
      console.error('Error handling notification action:', error);

      // Fallback to regular claim/reject APIs if sequential fails
      try {
        if (actionId === 'accept') {
          await api.post('/orders/claim', {
            orderId: data.orderId,
            itemId: data.itemId,
          });
          this.navigateToOrders();
        } else if (actionId === 'reject') {
          await api.post(`/orders/${data.orderId}/items/${data.itemId}/reject`);
        }
        console.log(`Fallback API call successful for action: ${actionId}`);
      } catch (fallbackError) {
        console.error('Fallback API call also failed:', fallbackError);
      }
    }
  }

  /**
   * Navigate to orders screen (this will be handled by navigation service)
   */
  private navigateToOrders() {
    // This will be implemented with navigation service
    // For now, we'll store a flag to handle navigation when app becomes active
    AsyncStorage.setItem('pendingNavigation', JSON.stringify({
      screen: 'Orders',
      params: { activeTab: 'new' }
    }));
  }

  /**
   * Register device token with backend
   */
  private async registerDeviceToken(token: string) {
    try {
      await api.post('/merchants/device-token', {
        deviceToken: token,
        deviceId: this.deviceId,
        platform: Platform.OS,
      });

      console.log('Device token registered with backend');
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken() {
    try {
      if (this.expoPushToken) {
        await api.delete('/merchants/device-token', {
          data: { deviceToken: this.expoPushToken }
        });
      }

      // Clear local storage
      await AsyncStorage.removeItem('expoPushToken');
      this.expoPushToken = null;

      console.log('Device token unregistered');
    } catch (error) {
      console.error('Failed to unregister device token:', error);
    }
  }

  /**
   * Get device ID for identification
   */
  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('deviceId');

    if (!deviceId) {
      // Generate a unique device ID
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }

    return deviceId;
  }

  /**
   * Get current push token
   */
  getCurrentToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async checkNotificationPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Send a test notification (for development)
   */
  async sendTestNotification() {
    if (this.expoPushToken) {
      await Notifications.presentNotificationAsync({
        title: 'Test Notification',
        body: 'Push notifications are working!',
        data: { test: true },
        categoryIdentifier: 'order_actions',
      });
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;