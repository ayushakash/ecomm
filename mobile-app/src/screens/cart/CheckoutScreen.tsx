import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Icon, Image, Input, Screen, ScreenHeader, Skeleton, Text } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLocation } from '../../contexts/LocationContext';
import { useCartTotals } from '../../hooks/queries';
import { queryKeys } from '../../hooks/queryKeys';
import type { RootStackScreenProps } from '../../navigation/types';
import { getErrorMessage, orderAPI } from '../../services/api';
import { colors, radii, SCREEN_PADDING, shadows, spacing } from '../../theme';
import type { Address, CreateOrderInput } from '../../types/models';
import { DELIVERY_WINDOW_LABEL, getDeliveryWindowMessage, isWithinDeliveryHours } from '../../utils/deliveryHours';
import { formatPrice } from '../../utils/pricing';
import { toast } from '../../utils/toast';
import { AddressDetails, AddressIcon, AddressPickerSheet } from './components/AddressCard';
import { BillSummary } from './components/BillSummary';
import { InvoicePreviewSheet } from './components/InvoicePreviewSheet';
import { LinkPhoneSheet } from './components/LinkPhoneSheet';

const COLLAPSED_ITEMS = 3;

/** Port of client/src/pages/cart/Checkout.js (COD only). Wrapped in RequireAuth by the navigator. */
export default function CheckoutScreen({ navigation }: RootStackScreenProps<'Checkout'>) {
  const { t } = useTranslation('checkout');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { cart, cartCity, clearCart, isHydrated } = useCart();
  const { user, needsPhone } = useAuth();
  const { addresses, merchantIds, fetchAddresses, setSelectedAddress: setContextAddress } = useLocation();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(addresses.length === 0);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [requireGSTBill, setRequireGSTBill] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  // Address ids present when the user tapped "Add new"; the first new id gets auto-selected on return.
  const pendingAddRef = useRef<Set<string> | null>(null);
  const selectedRef = useRef<Address | null>(null);
  selectedRef.current = selectedAddress;
  // Set once the order is placed so the cart-cleared state doesn't bounce back to the Cart tab.
  const placedRef = useRef(false);

  // Web refetches saved addresses on mount.
  useEffect(() => {
    void fetchAddresses().finally(() => setAddressesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Web: auto-select the default address (else the first) when none is selected. Also keeps the
  // selection fresh after edits/deletes and picks up an address just added from here.
  useEffect(() => {
    const pending = pendingAddRef.current;
    if (pending) {
      const added = addresses.find((a) => !pending.has(a._id));
      if (added) {
        pendingAddRef.current = null;
        setSelectedAddress(added);
        void setContextAddress(added);
        return;
      }
    }
    const current = selectedRef.current;
    const fresh = current ? addresses.find((a) => a._id === current._id) : undefined;
    setSelectedAddress(fresh ?? addresses.find((a) => a.isDefault) ?? addresses[0] ?? null);
  }, [addresses, setContextAddress]);

  // Web: an empty cart sends the user back to /cart.
  useEffect(() => {
    if (isHydrated && cart.length === 0 && !placedRef.current) {
      navigation.navigate('MainTabs', { screen: 'CartTab' });
    }
  }, [isHydrated, cart.length, navigation]);

  const {
    data: totals,
    isFetching: pricingFetching,
    isPlaceholderData: pricingStale,
  } = useCartTotals({ addressId: selectedAddress?._id, customerArea: selectedAddress?.area });

  const createOrder = useMutation({
    mutationFn: (orderData: CreateOrderInput) => orderAPI.createOrder(orderData),
    onSuccess: (res) => {
      placedRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll });
      navigation.replace('OrderSuccess', { order: res.order });
    },
    onError: (error) => {
      // The api interceptor toasts every status except 404/422; surface those here.
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404 || status === 422) toast.error(t('toast.orderFailed'), getErrorMessage(error));
    },
  });

  const localSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cityMismatch =
    !!cartCity && !!selectedAddress?.city && cartCity.toLowerCase() !== selectedAddress.city.toLowerCase();
  // Banner variant (web): only meaningful once merchants are known for the address.
  const unavailableItems = cart.filter(
    (item) => item.merchantId && merchantIds.length > 0 && !merchantIds.includes(item.merchantId),
  );
  const outsideDeliveryHours = !isWithinDeliveryHours();

  const selectAddress = (address: Address) => {
    setSelectedAddress(address);
    // Web: also update the context so nearby merchants refresh.
    void setContextAddress(address);
    setShowAddressSheet(false);
  };

  const addNewAddress = () => {
    setShowAddressSheet(false);
    pendingAddRef.current = new Set(addresses.map((a) => a._id));
    navigation.navigate('AddEditAddress');
  };

  const switchToCartCityAddress = () => {
    if (!cartCity) return;
    const match = addresses.find((a) => a.city.toLowerCase() === cartCity.toLowerCase());
    if (match) {
      setSelectedAddress(match);
      toast.success(t('toast.switchedCity', { city: cartCity }));
    } else {
      toast.error(t('toast.noCityAddress', { city: cartCity }), t('toast.noCityAddressHint'));
    }
  };

  const confirmClearCart = () =>
    Alert.alert(t('clearCart.title'), t('clearCart.message'), [
      { text: t('clearCart.cancel'), style: 'cancel' },
      { text: t('clearCart.confirm'), style: 'destructive', onPress: clearCart },
    ]);

  const placeOrder = () => {
    if (!user) return;
    // Google-auth users must verify a phone before ordering.
    if (!user.phone) {
      setShowPhoneSheet(true);
      return;
    }
    if (!selectedAddress) {
      toast.error(t('toast.selectAddress'));
      return;
    }
    if (cartCity && selectedAddress.city && cartCity.toLowerCase() !== selectedAddress.city.toLowerCase()) {
      toast.error(
        t('toast.cityMismatchTitle'),
        t('toast.cityMismatchMessage', { cartCity, addressCity: selectedAddress.city }),
      );
      return;
    }
    const undeliverable = cart.filter((item) => item.merchantId && !merchantIds.includes(item.merchantId));
    if (undeliverable.length > 0) {
      toast.error(t('toast.undeliverable', { count: undeliverable.length }));
      return;
    }
    if (!totals) return;

    const orderData: CreateOrderInput = {
      customerName: selectedAddress.fullName,
      customerPhone: selectedAddress.phoneNumber,
      customerAddress: `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}`,
      customerArea: selectedAddress.area,
      paymentMethod: 'cod',
      deliveryInstructions,
      // Web keeps a deliveryLocation state but no UI ever sets it; the server uses the address.
      deliveryLocation: null,
      addressId: selectedAddress._id,
      requireGSTBill,
      items: cart.map((item) => ({
        productId: item._id,
        productName: item.name,
        unitPrice: item.price,
        quantity: item.quantity,
        unit: item.unit,
        sku: item.sku,
        variantLabel: item.variantLabel || null,
        totalPrice: item.price * item.quantity,
      })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      deliveryCharge: totals.deliveryCharges,
      totalAmount: totals.totalAmount,
    };

    // Orders are accepted 24×7 but delivered 8 AM–7 PM.
    if (!isWithinDeliveryHours()) toast.info(getDeliveryWindowMessage(), undefined, 7000);

    createOrder.mutate(orderData);
  };

  if (!isHydrated || cart.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('title')} icon="bag-check-outline" />
      </Screen>
    );
  }

  const visibleItems = showAllItems ? cart : cart.slice(0, COLLAPSED_ITEMS);
  const pricingReady = !!totals && !pricingStale;
  const placeDisabled = !selectedAddress || unavailableItems.length > 0 || !pricingReady;
  const placeLabel = !selectedAddress
    ? t('cta.selectAddress')
    : unavailableItems.length > 0
      ? t('cta.removeUnavailable')
      : t('cta.placeOrder');

  return (
    <Screen>
      <ScreenHeader title={t('title')} subtitle={t('subtitle')} icon="bag-check-outline" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {outsideDeliveryHours && (
            <Animated.View entering={FadeInDown} style={[styles.notice, styles.noticeInfo]}>
              <Icon name="time-outline" size={20} color="info" />
              <View style={styles.flex}>
                <Text variant="label" weight="semibold">
                  {t('deliveryHours.title')}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {getDeliveryWindowMessage()}{' '}
                  <Trans
                    t={t}
                    i18nKey="deliveryHours.window"
                    values={{ window: DELIVERY_WINDOW_LABEL }}
                    components={{ bold: <Text variant="caption" weight="bold" /> }}
                  />
                </Text>
              </View>
            </Animated.View>
          )}

          {needsPhone && (
            <View style={[styles.notice, styles.noticeAmber]}>
              <Icon name="call-outline" size={20} color={colors.warning} />
              <View style={styles.flex}>
                <Text variant="label" weight="semibold">{t('phoneRequired.title')}</Text>
                <Text variant="caption" color="textSecondary">
                  {t('phoneRequired.message')}
                </Text>
                <Button
                  title={t('phoneRequired.action')}
                  size="sm"
                  variant="secondary"
                  onPress={() => setShowPhoneSheet(true)}
                  style={styles.noticeAction}
                />
              </View>
            </View>
          )}

          {cityMismatch && selectedAddress && cartCity && (
            <Animated.View entering={FadeIn} style={[styles.notice, styles.noticeDanger]}>
              <Icon name="warning-outline" size={20} color="danger" />
              <View style={styles.flex}>
                <Text variant="label" weight="bold" color="dangerDark">{t('cityMismatch.title')}</Text>
                <Text variant="caption" color="textSecondary">
                  <Trans
                    t={t}
                    i18nKey="cityMismatch.message"
                    values={{ cartCity, addressCity: selectedAddress.city }}
                    components={{ bold: <Text variant="caption" weight="bold" /> }}
                  />
                </Text>
                <View style={styles.noticeButtons}>
                  <Button title={t('cityMismatch.clearCart')} size="sm" variant="danger" leftIcon="trash-outline" onPress={confirmClearCart} />
                  <Button
                    title={t('cityMismatch.useCity', { city: cartCity })}
                    size="sm"
                    variant="outline"
                    leftIcon="swap-horizontal"
                    onPress={switchToCartCityAddress}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {unavailableItems.length > 0 && selectedAddress && (
            <View style={[styles.notice, styles.noticeAmber]}>
              <Icon name="alert-circle-outline" size={20} color={colors.warning} />
              <View style={styles.flex}>
                <Text variant="label" weight="semibold">{t('unavailable.title')}</Text>
                <Text variant="caption" color="textSecondary">
                  <Trans
                    t={t}
                    i18nKey="unavailable.message"
                    count={unavailableItems.length}
                    values={{ count: unavailableItems.length, place: `${selectedAddress.area}, ${selectedAddress.city}` }}
                    components={{ bold: <Text variant="caption" weight="bold" /> }}
                  />
                </Text>
                {unavailableItems.map((item) => (
                  <Text key={item.cartKey} variant="caption" color="textSecondary">
                    • {item.name}
                  </Text>
                ))}
                <Text variant="micro" color="textMuted">
                  {t('unavailable.hint')}
                </Text>
              </View>
            </View>
          )}

          {/* Delivery address */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h3">{t('address.title')}</Text>
              <Pressable onPress={addNewAddress} accessibilityRole="button" hitSlop={8} style={styles.headerLink}>
                <Icon name="add" size={18} color="primary" />
                <Text variant="label" color="primary" weight="semibold">{t('address.addNewShort')}</Text>
              </Pressable>
            </View>

            {addressesLoading && addresses.length === 0 ? (
              <View style={styles.addressSkeleton}>
                <Skeleton width={36} height={36} radius={radii.sm} />
                <View style={styles.flex}>
                  <Skeleton width="50%" />
                  <Skeleton width="80%" height={12} style={styles.skeletonGap} />
                  <Skeleton width="65%" height={12} style={styles.skeletonGap} />
                </View>
              </View>
            ) : selectedAddress ? (
              <Pressable
                onPress={() => setShowAddressSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={t('address.changeA11y')}
                style={styles.selectedAddress}
              >
                <AddressIcon type={selectedAddress.addressType} />
                <AddressDetails address={selectedAddress} />
                <Text variant="label" color="primary" weight="bold">
                  {t('address.change')}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={addNewAddress} accessibilityRole="button" style={styles.emptyAddress}>
                <Icon name="location-outline" size={32} color="textMuted" />
                <Text variant="body" color="textSecondary" weight="medium">{t('address.empty')}</Text>
                <Text variant="label" color="primary" weight="semibold">{t('address.addFirst')}</Text>
              </Pressable>
            )}
          </Card>

          {/* Order summary */}
          <Card style={styles.section}>
            <Text variant="h3">{t('summary.title')}</Text>
            {visibleItems.map((item) => (
              <View key={item.cartKey} style={styles.item}>
                <Image uri={item.images?.[0]} style={styles.itemImage} recyclingKey={item.cartKey} fallbackIcon="cube-outline" />
                <View style={styles.flex}>
                  <Text variant="bodySm" weight="semibold" numberOfLines={2}>
                    {item.name}
                  </Text>
                  {!!item.variantLabel && (
                    <Text variant="micro" color="primary" weight="semibold">
                      {item.variantLabel}
                    </Text>
                  )}
                  <Text variant="caption" color="textSecondary">
                    {t('summary.itemLine', { quantity: item.quantity, price: formatPrice(item.price), unit: item.unit })}
                  </Text>
                </View>
                <Text variant="title" color="primary">
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            {cart.length > COLLAPSED_ITEMS && (
              <Pressable onPress={() => setShowAllItems((v) => !v)} accessibilityRole="button" style={styles.toggleItems}>
                <Text variant="label" color="primary" weight="semibold">
                  {showAllItems ? t('summary.showLess') : t('summary.showAll', { count: cart.length })}
                </Text>
                <Icon name={showAllItems ? 'chevron-up' : 'chevron-down'} size={16} color="primary" />
              </Pressable>
            )}
          </Card>

          {/* Bill */}
          <Card style={styles.section}>
            <Text variant="h3">{t('bill.title')}</Text>
            <BillSummary
              totals={totals}
              updating={pricingFetching}
              fallbackSubtotal={localSubtotal}
              itemCount={cart.length}
              requireGSTBill={requireGSTBill}
            />
            <View style={styles.gstRow}>
              <Icon name="document-text-outline" size={20} color="textSecondary" />
              <View style={styles.flex}>
                <Text variant="label" weight="semibold">{t('bill.gstToggle')}</Text>
                <Text variant="caption" color="textSecondary">
                  {t('bill.gstToggleHint')}
                </Text>
              </View>
              <Switch
                value={requireGSTBill}
                onValueChange={setRequireGSTBill}
                trackColor={{ true: colors.secondary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel={t('bill.gstToggle')}
              />
            </View>
            {requireGSTBill && (
              <Button
                title={t('bill.previewInvoice')}
                variant="outline"
                size="sm"
                leftIcon="document-text-outline"
                onPress={() => setShowInvoice(true)}
              />
            )}
          </Card>

          {/* Instructions */}
          <Card style={styles.section}>
            <Input
              label={t('instructions.label')}
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              placeholder={t('instructions.placeholder')}
              multiline
              textAreaHeight={88}
            />
          </Card>

          {/* Payment */}
          <Card style={styles.section}>
            <Text variant="h3">{t('payment.title')}</Text>
            <View style={[styles.payment, styles.paymentSelected]}>
              <Icon name="cash-outline" size={22} color="successDark" />
              <View style={styles.flex}>
                <Text variant="label" weight="semibold">{t('payment.cod')}</Text>
                <Text variant="caption" color="textSecondary">{t('payment.codHint')}</Text>
              </View>
              <Icon name="radio-button-on" size={20} color="secondary" />
            </View>
            <View style={[styles.payment, styles.paymentDisabled]}>
              <Icon name="card-outline" size={22} color="textMuted" />
              <View style={styles.flex}>
                <Text variant="label" color="textMuted">{t('payment.online')}</Text>
                <Text variant="caption" color="textMuted">{t('payment.comingSoon')}</Text>
              </View>
              <Icon name="radio-button-off" size={20} color="textMuted" />
            </View>
          </Card>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <View>
            <Text variant="caption" color="textSecondary">{t('total')}</Text>
            {totals ? (
              <Text variant="h2">{formatPrice(totals.totalAmount)}</Text>
            ) : (
              <Skeleton width={84} height={22} />
            )}
          </View>
          <Button
            title={placeLabel}
            variant="secondary"
            size="lg"
            rightIcon={placeDisabled ? undefined : 'arrow-forward'}
            loading={createOrder.isPending}
            disabled={placeDisabled || createOrder.isPending}
            onPress={placeOrder}
            style={styles.flex}
          />
        </View>
      </KeyboardAvoidingView>

      <AddressPickerSheet
        visible={showAddressSheet}
        addresses={addresses}
        selectedId={selectedAddress?._id}
        onSelect={selectAddress}
        onAddNew={addNewAddress}
        onClose={() => setShowAddressSheet(false)}
      />
      <LinkPhoneSheet visible={showPhoneSheet} onClose={() => setShowPhoneSheet(false)} />
      <InvoicePreviewSheet
        visible={showInvoice}
        onClose={() => setShowInvoice(false)}
        cart={cart}
        totals={totals}
        address={selectedAddress}
        fallbackName={user?.name}
        fallbackPhone={user?.phone}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SCREEN_PADDING, gap: spacing.md, paddingBottom: spacing.xxxl },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  noticeInfo: { backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
  noticeAmber: { backgroundColor: colors.warningSoft, borderColor: colors.secondarySoft },
  noticeDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  noticeAction: { alignSelf: 'flex-start', marginTop: spacing.sm },
  noticeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  addressSkeleton: { flexDirection: 'row', gap: spacing.md },
  skeletonGap: { marginTop: spacing.sm },
  selectedAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    backgroundColor: colors.secondarySoft,
  },
  emptyAddress: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemImage: { width: 48, height: 48, borderRadius: radii.sm },
  toggleItems: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 36 },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  paymentSelected: { borderColor: colors.secondary, backgroundColor: colors.secondarySoft },
  paymentDisabled: { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
});
