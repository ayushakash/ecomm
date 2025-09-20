import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { THEME, SIZES } from '../../theme';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

interface NotificationProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

const notificationConfig = {
  success: {
    icon: 'checkmark-circle-outline',
    colors: {
      primary: '#10B981',
      secondary: '#D1FAE5',
      text: '#065F46',
    },
    emoji: '✅',
  },
  error: {
    icon: 'close-circle-outline',
    colors: {
      primary: '#EF4444',
      secondary: '#FEE2E2',
      text: '#991B1B',
    },
    emoji: '❌',
  },
  info: {
    icon: 'information-circle-outline',
    colors: {
      primary: '#3B82F6',
      secondary: '#DBEAFE',
      text: '#1E40AF',
    },
    emoji: 'ℹ️',
  },
  warning: {
    icon: 'warning-outline',
    colors: {
      primary: '#F59E0B',
      secondary: '#FEF3C7',
      text: '#92400E',
    },
    emoji: '⚠️',
  },
};

const BeautifulNotification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  visible,
  onDismiss,
  duration = 4000,
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const config = notificationConfig[type];

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration]);

  if (!visible && slideAnim._value === -200) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <BlurView intensity={95} tint="light" style={styles.blurContainer}>
        <View style={[styles.notification, { borderLeftColor: config.colors.primary }]}>
          {/* Progress bar */}
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: config.colors.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />

          {/* Content */}
          <View style={styles.content}>
            {/* Icon and emoji */}
            <View style={[styles.iconContainer, { backgroundColor: config.colors.secondary }]}>
              <Text style={styles.emoji}>{config.emoji}</Text>
              <Ionicons
                name={config.icon as any}
                size={24}
                color={config.colors.primary}
                style={styles.icon}
              />
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: config.colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              {message && (
                <Text style={[styles.message, { color: config.colors.text }]} numberOfLines={3}>
                  {message}
                </Text>
              )}
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={config.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Decorative elements */}
          <View style={[styles.decorativeCircle, { backgroundColor: config.colors.secondary }]} />
          <View style={[styles.decorativeCircle2, { backgroundColor: config.colors.primary }]} />
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 10,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  notification: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderLeftWidth: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderTopLeftRadius: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 25,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  emoji: {
    fontSize: 20,
    position: 'absolute',
    top: -5,
    right: -5,
  },
  icon: {
    opacity: 0.8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -50,
    right: -30,
    opacity: 0.1,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: -30,
    left: -20,
    opacity: 0.05,
  },
});

export default BeautifulNotification;