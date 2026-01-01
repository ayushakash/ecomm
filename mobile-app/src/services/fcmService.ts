import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class FCMService {
  private fcmToken: string | null = null;
  private deviceId: string | null = null;

  /**
   * Initialize FCM (using Expo Notifications with FCM backend)
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 FCM Service - initialize() called');
      console.log('📱 Device info:', {
        isDevice: Device.isDevice,
        platform: Platform.OS,
        executionEnvironment: Constants.executionEnvironment,
      });

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('❌ Push notifications only work on physical devices');
        return false;
      }

      // Request permission
      const authStatus = await this.requestPermission();
      if (!authStatus) {
        console.warn('❌ Notification permission not granted');
        return false;
      }

      // Get Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      if (!tokenData?.data) {
        console.error('❌ Failed to get push token');
        return false;
      }

      this.fcmToken = tokenData.data;
      console.log('✅ Push Token:', this.fcmToken);

      // Store token locally
      await AsyncStorage.setItem('fcmToken', this.fcmToken);

      // Get device ID
      this.deviceId = await this.getDeviceId();
      console.log('📱 Device ID:', this.deviceId);

      // Register token with backend
      console.log('📤 Registering token with backend...');
      await this.registerDeviceToken(this.fcmToken);
      console.log('✅ Token registration complete');

      // Setup message handlers
      this.setupMessageHandlers();

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order-notifications', {
          name: 'Order Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      console.log('✅ FCM initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      console.log('📱 Permission status:', finalStatus);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers() {
    // Foreground messages
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received:', notification);
    });

    // Notification tapped
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📬 Notification tapped:', response);
      this.handleNotificationAction(response.notification.request.content.data);
    });
  }

  /**
   * Handle notification actions
   */
  private async handleNotificationAction(data: any) {
    if (data?.type === 'new_order') {
      // Navigate to orders screen
      await AsyncStorage.setItem('pendingNavigation', JSON.stringify({
        screen: 'Orders',
        params: { orderId: data.orderId }
      }));
    }
  }

  /**
   * Register device token with backend
   */
  private async registerDeviceToken(token: string) {
    try {
      console.log('📤 Sending token to backend:', {
        deviceToken: token.substring(0, 30) + '...',
        deviceId: this.deviceId,
        platform: Platform.OS,
      });

      const response = await api.post('/api/merchants/device-token', {
        deviceToken: token,
        deviceId: this.deviceId,
        platform: Platform.OS,
      });

      console.log('✅ Backend response:', response.data);
      console.log('✅ FCM token registered successfully!');
    } catch (error: any) {
      console.error('❌ Failed to register FCM token:', error.message);
      console.error('❌ Error details:', error.response?.data || error);
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken() {
    try {
      if (this.fcmToken) {
        await api.delete('/merchants/device-token', {
          data: { deviceToken: this.fcmToken }
        });
      }

      // No need to delete Expo token
      await AsyncStorage.removeItem('fcmToken');
      this.fcmToken = null;

      console.log('✅ FCM token unregistered');
    } catch (error) {
      console.error('Failed to unregister FCM token:', error);
    }
  }

  /**
   * Get device ID
   */
  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('deviceId');

    if (!deviceId) {
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }

    return deviceId;
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
}

export const fcmService = new FCMService();
export default fcmService;