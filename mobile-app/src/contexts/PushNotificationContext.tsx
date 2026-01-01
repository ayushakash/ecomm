import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
import fcmService from '../services/fcmService';
import Constants from 'expo-constants';

interface PushNotificationContextType {
  isInitialized: boolean;
  hasPermission: boolean;
  pushToken: string | null;
  initializePushNotifications: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
};

interface PushNotificationProviderProps {
  children: ReactNode;
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Check if we're in Expo Go (which doesn't support push notifications)
  // In development builds, appOwnership is null, but executionEnvironment tells us the truth
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Safe navigation - we'll handle this differently to avoid hook issues

  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  // Initialize push notifications when user logs in and is a merchant
  useEffect(() => {
    console.log('🔔 PushNotification Context - useEffect triggered');
    console.log('   User:', user ? `${user.name} (${user.role})` : 'null');
    console.log('   isInitialized:', isInitialized);
    console.log('   isExpoGo:', isExpoGo);

    if (user && user.role === 'merchant' && !isInitialized && !isExpoGo) {
      console.log('✅ Conditions met - Starting push notification initialization...');
      initializePushNotifications();
    } else {
      console.log('❌ Not initializing push notifications:');
      if (!user) console.log('   - No user logged in');
      if (user && user.role !== 'merchant') console.log(`   - User role is ${user.role}, not merchant`);
      if (isInitialized) console.log('   - Already initialized');
      if (isExpoGo) console.log('   - Running in Expo Go');
    }
  }, [user, isInitialized, isExpoGo]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Check for pending navigation when app comes to foreground
        await checkPendingNavigation();

        // Re-check permissions
        if (isInitialized) {
          const hasPermissions = await fcmService.checkPermission();
          setHasPermission(hasPermissions);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isInitialized]);

  /**
   * Initialize push notifications
   */
  const initializePushNotifications = async (): Promise<boolean> => {
    try {
      console.log('🔔 initializePushNotifications() called');

      if (isExpoGo) {
        console.log('❌ Detected Expo Go - cannot initialize');
        showError('Not Supported', 'Push notifications require a development build. Cannot use Expo Go.');
        return false;
      }

      console.log('📱 Starting FCM initialization...');

      const success = await fcmService.initialize();

      if (success) {
        const token = fcmService.getCurrentToken();
        const hasPermissions = await fcmService.checkPermission();

        setPushToken(token);
        setHasPermission(hasPermissions);
        setIsInitialized(true);

        showSuccess('Push Notifications Enabled', 'You will receive order notifications');
        console.log('Push notifications initialized successfully');
        return true;
      } else {
        showError('Push Notifications Failed', 'Unable to initialize notifications');
        console.error('Failed to initialize push notifications');
        return false;
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      showError('Notification Error', 'Failed to set up push notifications');
      return false;
    }
  };

  /**
   * Request notification permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const granted = await fcmService.requestPermission();
      setHasPermission(granted);

      if (granted && !isInitialized) {
        return await initializePushNotifications();
      }

      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  /**
   * Send test notification (development only)
   */
  const sendTestNotification = async (): Promise<void> => {
    try {
      showSuccess('Test Notification', 'FCM is ready to receive notifications!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      showError('Test Failed', 'Unable to send test notification');
    }
  };

  /**
   * Check for pending navigation from notification tap
   */
  const checkPendingNavigation = async () => {
    try {
      const pendingNav = await AsyncStorage.getItem('pendingNavigation');
      if (pendingNav) {
        const navData = JSON.parse(pendingNav);

        // Clear the pending navigation
        await AsyncStorage.removeItem('pendingNavigation');

        // Navigate to the screen - will be handled by the app when it becomes active
        if (navData.screen === 'Orders') {
          showSuccess('New Order', 'Check your orders for updates');
        }
      }
    } catch (error) {
      console.error('Error checking pending navigation:', error);
    }
  };

  const value: PushNotificationContextType = {
    isInitialized,
    hasPermission,
    pushToken,
    initializePushNotifications,
    requestPermissions,
    sendTestNotification,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationContext;