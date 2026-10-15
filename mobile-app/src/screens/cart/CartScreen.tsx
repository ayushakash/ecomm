import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Button, Card, EmptyState, Icon, Screen, ScreenHeader, Skeleton, Text } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';
import { useCartTotals, usePublicSettings } from '../../hooks/queries';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, radii, SCREEN_PADDING, shadows, spacing } from '../../theme';
import type { CartItem } from '../../types/models';
import { formatPrice } from '../../utils/pricing';
import { BillSummary } from './components/BillSummary';
import { CartLineItem } from './components/CartLineItem';

/** Port of client/src/pages/cart/Cart.js. */
export default function CartScreen({ navigation }: MainTabScreenProps<'CartTab'>) {
  const { t } = useTranslation('cart');
  const { cart, isHydrated, removeFromCart, updateQuantity, clearCart, syncCartPrices } = useCart();
  const { isAuthenticated } = useAuth();
  const requireAuth = useAuthGate();
  const { getCartWhatsAppLink, openCartWhatsApp, callNumber, callToOrder } = useBulkWhatsApp();
  const { data: settings } = usePublicSettings();
  const { data: totals, isFetching: pricingFetching } = useCartTotals();

  // Refresh stored line prices whenever the tab gains focus (web: on mount/login).
  const syncRef = useRef(syncCartPrices);
  syncRef.current = syncCartPrices;
  const hasItemsRef = useRef(cart.length > 0);
  hasItemsRef.current = cart.length > 0;
  useFocusEffect(
    useCallback(() => {
      if (hasItemsRef.current) void syncRef.current();
    }, [isAuthenticated]),
  );

  const localTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // While server pricing loads, show the subtotal only — never guess GST/delivery client-side.
  const subtotal = totals?.subtotal ?? localTotal;
  const totalAmount = totals?.totalAmount ?? localTotal;
  const minimumOrderValue = settings?.minimumOrderValue ?? 0;
  const isMinimumOrderMet = subtotal >= minimumOrderValue;
  const whatsAppLink = getCartWhatsAppLink(cart, totalAmount);

  const handleCheckout = () => {
    if (!requireAuth({ name: 'Checkout' })) return;
    if (!isMinimumOrderMet) return;
    navigation.navigate('Checkout');
  };

  const confirmClear = () =>
    Alert.alert(t('clear.title'), t('clear.message'), [
      { text: t('clear.cancel'), style: 'cancel' },
      { text: t('clear.confirm'), style: 'destructive', onPress: clearCart },
    ]);

  const openProduct = useCallback(
    (item: CartItem) => navigation.navigate('ProductDetail', { productId: item._id }),
    [navigation],
  );

  const goShopping = () => navigation.navigate('MainTabs', { screen: 'ProductsTab' });

  if (!isHydrated) {
    return (
      <Screen>
        <ScreenHeader title={t('title')} back={false} icon="cart-outline" />
        <View style={styles.content}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={72} height={72} radius={radii.md} />
              <View style={styles.skeletonText}>
                <Skeleton width="70%" />
                <Skeleton width="40%" height={12} />
                <Skeleton width={96} height={28} radius={radii.sm} />
              </View>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  if (cart.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('title')} back={false} icon="cart-outline" />
        <EmptyState
          icon="cart-outline"
          title={t('empty.title')}
          message={t('empty.message')}
          actionLabel={t('empty.action')}
          onAction={goShopping}
        />
      </Screen>
    );
  }

  const ctaLabel = !isMinimumOrderMet
    ? t('cta.minimum', { amount: formatPrice(minimumOrderValue) })
    : !isAuthenticated
      ? t('cta.login')
      : t('cta.proceed');

  return (
    <Screen>
      <ScreenHeader
        title={t('title')}
        icon="cart-outline"
        subtitle={t('itemCount', { count: cart.length })}
        back={false}
        actions={[{ icon: 'trash-outline', onPress: confirmClear, accessibilityLabel: t('clear.button') }]}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padding={0} style={styles.itemsCard}>
          {cart.map((item, index) => (
            <Animated.View
              key={item.cartKey}
              entering={FadeIn}
              exiting={FadeOut.duration(180)}
              layout={LinearTransition.duration(220)}
              style={index > 0 && styles.itemDivider}
            >
              <CartLineItem item={item} onQuantityChange={updateQuantity} onRemove={removeFromCart} onOpen={openProduct} />
            </Animated.View>
          ))}
          <Pressable onPress={goShopping} accessibilityRole="button" style={styles.continue}>
            <Icon name="add-circle-outline" size={18} color="primary" />
            <Text variant="label" color="primary" weight="semibold">
              {t('addMore')}
            </Text>
          </Pressable>
        </Card>
        <Text variant="micro" color="textMuted" align="center">
          {t('swipeTip')}
        </Text>

        <Card style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            {t('billDetails')}
          </Text>
          <BillSummary totals={totals} updating={pricingFetching} fallbackSubtotal={localTotal} itemCount={cart.length} />
        </Card>

        {!isAuthenticated && (
          <View style={[styles.notice, styles.noticeAmber]}>
            <Icon name="lock-closed-outline" size={18} color={colors.warning} />
            <View style={styles.flex}>
              <Text variant="label" weight="semibold">{t('loginNotice.title')}</Text>
              <Text variant="caption" color="textSecondary">{t('loginNotice.message')}</Text>
            </View>
          </View>
        )}

        {!isMinimumOrderMet && (
          <View style={[styles.notice, styles.noticeAmber]}>
            <Icon name="warning-outline" size={18} color={colors.warning} />
            <View style={styles.flex}>
              <Text variant="label" weight="semibold">{t('minimumNotice.title')}</Text>
              <Text variant="caption" color="textSecondary">
                {t('minimumNotice.message', {
                  remaining: formatPrice(minimumOrderValue - subtotal),
                  minimum: formatPrice(minimumOrderValue),
                })}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.altActions}>
          {!!whatsAppLink && (
            <Button
              title={t('whatsappOrder')}
              variant="whatsapp"
              leftIcon="logo-whatsapp"
              fullWidth
              onPress={() => void openCartWhatsApp(cart, totalAmount)}
            />
          )}
          {!!callNumber && (
            <Button
              title={totalAmount > 10000 ? t('callToOrderBulk') : t('callToOrder')}
              variant="outline"
              leftIcon="call-outline"
              fullWidth
              onPress={() => void callToOrder()}
            />
          )}
          <Button title={t('clear.button')} variant="ghost" leftIcon="trash-outline" fullWidth onPress={confirmClear} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text variant="caption" color="textSecondary">
            {totals ? t('toPay') : t('subtotal')}
          </Text>
          <Text variant="h2">{formatPrice(totalAmount)}</Text>
        </View>
        <Button
          title={ctaLabel}
          variant="secondary"
          size="lg"
          leftIcon={isMinimumOrderMet && !isAuthenticated ? 'lock-closed' : undefined}
          rightIcon={isMinimumOrderMet && isAuthenticated ? 'arrow-forward' : undefined}
          disabled={!isMinimumOrderMet}
          onPress={handleCheckout}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SCREEN_PADDING, gap: spacing.md, paddingBottom: spacing.xxxl },
  itemsCard: { overflow: 'hidden' },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    minHeight: 44,
  },
  section: { gap: spacing.sm },
  sectionTitle: { marginBottom: spacing.xs },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  noticeAmber: { backgroundColor: colors.warningSoft, borderColor: colors.secondarySoft },
  altActions: { gap: spacing.sm },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  cta: { flex: 1 },
  skeletonRow: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.lg },
  skeletonText: { flex: 1, gap: spacing.sm },
});
