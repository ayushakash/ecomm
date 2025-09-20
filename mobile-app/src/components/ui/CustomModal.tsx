import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES, SHADOWS } from '../../theme';
import Button from './Button';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  showCloseButton?: boolean;
}

const { width, height } = Dimensions.get('window');

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  icon,
  buttons = [{ text: 'OK', onPress: onClose, style: 'primary' }],
  showCloseButton = true,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          iconColor: THEME.success,
          iconBackground: THEME.success + '20',
          defaultIcon: 'checkmark-circle',
        };
      case 'error':
        return {
          iconColor: THEME.error,
          iconBackground: THEME.error + '20',
          defaultIcon: 'close-circle',
        };
      case 'warning':
        return {
          iconColor: THEME.warning,
          iconBackground: THEME.warning + '20',
          defaultIcon: 'warning',
        };
      default:
        return {
          iconColor: THEME.info,
          iconBackground: THEME.info + '20',
          defaultIcon: 'information-circle',
        };
    }
  };

  const typeStyles = getTypeStyles();

  const getButtonStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'danger':
        return styles.dangerButton;
      case 'secondary':
        return styles.secondaryButton;
      default:
        return styles.primaryButton;
    }
  };

  const getButtonTextStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'danger':
        return styles.dangerButtonText;
      case 'secondary':
        return styles.secondaryButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={THEME.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: typeStyles.iconBackground }]}>
            <Ionicons
              name={icon || typeStyles.defaultIcon}
              size={40}
              color={typeStyles.iconColor}
            />
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  buttons.length === 1 && styles.singleButton,
                  index === 0 && buttons.length > 1 && styles.firstButton,
                  index === buttons.length - 1 && buttons.length > 1 && styles.lastButton,
                ]}
                onPress={button.onPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: THEME.background,
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.lg,
    marginHorizontal: SIZES.lg,
    maxWidth: width * 0.9,
    minWidth: width * 0.8,
    alignItems: 'center',
    ...SHADOWS.large,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: SIZES.md,
    right: SIZES.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  message: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: SIZES.md,
  },
  button: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  singleButton: {
    flex: 1,
  },
  firstButton: {
    marginRight: SIZES.xs,
  },
  lastButton: {
    marginLeft: SIZES.xs,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dangerButton: {
    backgroundColor: THEME.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: THEME.background,
  },
  secondaryButtonText: {
    color: THEME.text,
  },
  dangerButtonText: {
    color: THEME.background,
  },
});

export default CustomModal;