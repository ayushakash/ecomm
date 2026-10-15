import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button, Card, Icon, Screen, Text, type IconName } from '../../components/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, radii, SCREEN_PADDING, spacing } from '../../theme';
import { DELIVERY_WINDOW_LABEL, getDeliveryWindowMessage, isWithinDeliveryHours } from '../../utils/deliveryHours';
import { formatPrice } from '../../utils/pricing';

const BADGE_SIZE = 112;

function SuccessBadge() {
  const circle = useSharedValue(0);
  const check = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    circle.value = withSpring(1, { damping: 12, stiffness: 140 });
    check.value = withDelay(220, withSpring(1, { damping: 9, stiffness: 180 }));
    ring.value = withDelay(300, withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 0 })), 3));
  }, [circle, check, ring]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circle.value }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: 0.4 + check.value * 0.6 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.6 }] }));

  return (
    <View style={styles.badgeWrap}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.circle, circleStyle]}>
        <Animated.View style={checkStyle}>
          <Icon name="checkmark" size={64} color="textInverse" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function InfoRow({ icon, title, subtitle }: { icon: IconName; title: string; subtitle: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={18} color="successDark" />
      </View>
      <View style={styles.flex}>
        <Text variant="label" weight="semibold">{title}</Text>
        <Text variant="caption" color="textSecondary">{subtitle}</Text>
      </View>
    </View>
  );
}

/** Port of client/src/pages/orders/OrderSuccess.js. Reached via navigation.replace from Checkout. */
export default function OrderSuccessScreen({ navigation, route }: RootStackScreenProps<'OrderSuccess'>) {
  const { t } = useTranslation('checkout');
  const { order } = route.params;

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }] });
  }, [navigation]);

  // Android back must not return to the (now empty) checkout flow.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome]),
  );

  const withinHours = isWithinDeliveryHours();

  return (
    <Screen safeTop safeBottom background={colors.surface}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SuccessBadge />

        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.heading}>
          <Text variant="display" align="center">
            {t('success.title')}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {t('success.message')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.block}>
          <Card style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text variant="bodySm" color="textSecondary">{t('success.orderNumber')}</Text>
              <Text variant="title" selectable>
                {order.orderNumber || t('success.generating')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodySm" color="textSecondary">{t('success.totalAmount')}</Text>
              <Text variant="title" color="successDark">{formatPrice(order.totalAmount || 0)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.alignTop]}>
              <Text variant="bodySm" color="textSecondary">{t('success.deliveryTo')}</Text>
              <Text variant="bodySm" align="right" style={styles.address}>
                {order.customerAddress || t('success.selectedAddress')}
                {order.customerArea ? `, ${order.customerArea}` : ''}
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550).duration(400)} style={[styles.block, styles.infoList]}>
          <InfoRow
            icon="time-outline"
            title={withinHours ? t('success.sameDay') : t('success.scheduled')}
            subtitle={withinHours ? t('success.deliveryHours', { window: DELIVERY_WINDOW_LABEL }) : getDeliveryWindowMessage()}
          />
          <InfoRow
            icon="cash-outline"
            title={t('success.payOnDelivery')}
            subtitle={t('success.keepReady', { amount: formatPrice(order.totalAmount || 0) })}
          />
          <InfoRow
            icon="bicycle-outline"
            title={order.deliveryCharge > 0 ? t('success.deliveryCharge', { amount: formatPrice(order.deliveryCharge) }) : t('success.freeDelivery')}
            subtitle={order.deliveryCharge > 0 ? t('success.includedInTotal') : t('success.noExtraCharges')}
          />
        </Animated.View>

        <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
          {t('success.footnote')}
        </Text>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(700).duration(400)} style={styles.actions}>
        <Button
          title={t('success.viewOrder')}
          variant="secondary"
          size="lg"
          leftIcon="receipt-outline"
          fullWidth
          onPress={() => navigation.replace('OrderDetail', { orderId: order._id })}
        />
        <Button title={t('success.continueShopping')} variant="outline" size="lg" leftIcon="home-outline" fullWidth onPress={goHome} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: SCREEN_PADDING, paddingTop: spacing.huge, alignItems: 'center', gap: spacing.xl },
  badgeWrap: { width: BADGE_SIZE * 1.6, height: BADGE_SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.success,
  },
  circle: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { gap: spacing.sm, maxWidth: 340 },
  block: { alignSelf: 'stretch' },
  summary: { gap: spacing.md, backgroundColor: colors.surfaceMuted },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  alignTop: { alignItems: 'flex-start' },
  address: { flex: 1 },
  infoList: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { maxWidth: 320 },
  actions: { gap: spacing.sm, paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md, paddingBottom: spacing.md },
});
