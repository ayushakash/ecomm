import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';
import Button from '../../components/ui/Button';

interface OrderSuccessScreenProps {
  navigation: any;
  route: {
    params: {
      orderId?: string;
      orderNumber?: string;
      totalAmount?: number;
    };
  };
}

const { width } = Dimensions.get('window');

const OrderSuccessScreen: React.FC<OrderSuccessScreenProps> = ({ navigation, route }) => {
  const { orderId, orderNumber, totalAmount } = route.params || {};

  // Animation values
  const checkmarkScale = new Animated.Value(0);
  const confettiOpacity = new Animated.Value(0);
  const contentOpacity = new Animated.Value(0);

  useEffect(() => {
    // Start animations
    const animationSequence = Animated.sequence([
      // Checkmark animation
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      // Confetti and content fade in
      Animated.parallel([
        Animated.timing(confettiOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationSequence.start();
  }, []);

  const handleContinueShopping = () => {
    navigation.navigate('GuestMain', { screen: 'Home' });
  };

  const handleViewOrders = () => {
    navigation.navigate('GuestMain', { screen: 'Orders' });
  };

  const renderConfetti = () => {
    const confettiElements = [];
    for (let i = 0; i < 20; i++) {
      confettiElements.push(
        <Animated.View
          key={i}
          style={[
            styles.confetti,
            {
              left: Math.random() * width,
              backgroundColor: i % 3 === 0 ? THEME.primary : i % 3 === 1 ? THEME.success : THEME.warning,
              opacity: confettiOpacity,
              transform: [
                {
                  translateY: confettiOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 600],
                  }),
                },
                {
                  rotate: confettiOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      );
    }
    return confettiElements;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti Animation */}
      <View style={styles.confettiContainer}>
        {renderConfetti()}
      </View>

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={120} color={THEME.success} />
          </Animated.View>
        </View>

        {/* Success Content */}
        <Animated.View style={[styles.textContainer, { opacity: contentOpacity }]}>
          <Text style={styles.title}>Order Placed Successfully! 🎉</Text>
          <Text style={styles.subtitle}>
            Thank you for your order! We're preparing it for delivery.
          </Text>

          {/* Order Details */}
          <View style={styles.orderDetails}>
            {orderNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Number:</Text>
                <Text style={styles.detailValue}>#{orderNumber}</Text>
              </View>
            )}
            {totalAmount && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>₹{Math.round(totalAmount).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>Cash on Delivery</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={THEME.info} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>What's next?</Text>
              <Text style={styles.infoDescription}>
                You'll receive updates about your order status. Our delivery team will contact you before delivery.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.buttonsContainer, { opacity: contentOpacity }]}>
          <Button
            title="View My Orders"
            onPress={handleViewOrders}
            style={styles.primaryButton}
            leftIcon="receipt-outline"
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinueShopping}
          >
            <Ionicons name="home-outline" size={20} color={THEME.primary} />
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    zIndex: 2,
  },
  iconContainer: {
    marginBottom: SIZES.xl,
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.lg,
  },
  orderDetails: {
    backgroundColor: THEME.surface,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    width: '100%',
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: THEME.info + '15',
    borderRadius: SIZES.md,
    padding: SIZES.md,
    width: '100%',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: SIZES.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.info,
    marginBottom: SIZES.xs,
  },
  infoDescription: {
    fontSize: 12,
    color: THEME.info,
    lineHeight: 18,
  },
  buttonsContainer: {
    width: '100%',
    gap: SIZES.md,
  },
  primaryButton: {
    minHeight: 50,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: SIZES.md,
    backgroundColor: 'transparent',
    minHeight: 50,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
});

export default OrderSuccessScreen;