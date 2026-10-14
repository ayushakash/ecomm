import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  Image,
  ORDER_STATUS_BADGE,
  Screen,
  ScreenHeader,
  Skeleton,
  SkeletonLines,
  Text,
  type IconName,
} from '../../components/ui';
import { queryKeys } from '../../hooks/queryKeys';
import { useOrder, useOrderLifecycle } from '../../hooks/queries';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';
import type { RootStackScreenProps } from '../../navigation/types';
import { orderAPI } from '../../services/api';
import { colors, radii, SCREEN_PADDING, spacing } from '../../theme';
import type { Order } from '../../types/models';
import { toast } from '../../utils/toast';
import { callPhone, openExternal } from '../../utils/whatsapp';
import { InvoiceModal } from './components/InvoiceModal';
import { OrderProgress } from './components/OrderProgress';
import { OrderTimeline } from './components/OrderTimeline';
import {
  canCancelOrder,
  formatAmount,
  formatOrderDate,
  getBillBreakdown,
  getDeliveryAddress,
  getDetailEta,
  getItemLineTotal,
  getItemProduct,
  PAYMENT_STATUS_BADGE,
  paymentMethodLabel,
} from './components/orderUtils';

/** Port of client/src/pages/orders/OrderDetail.js + OrderHistory.js expanded view, lifecycle and GST invoice. */
export default function OrderDetailScreen({ navigation, route }: RootStackScreenProps<'OrderDetail'>) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const orderQuery = useOrder(orderId);
  const lifecycleQuery = useOrderLifecycle(orderId, !!orderQuery.data);
  const support = useBulkWhatsApp();
  const [refreshing, setRefreshing] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () => orderAPI.cancelOrder(orderId),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success('Order cancelled successfully');
      queryClient.setQueryData<Order>(queryKeys.order(orderId), (prev) => (prev ? { ...prev, ...res.order } : res.order));
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
    },
    // api.ts already toasts the server message (e.g. "Cannot cancel a delivered order").
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([orderQuery.refetch(), lifecycleQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [orderQuery, lifecycleQuery]);

  const order = orderQuery.data;

  if (orderQuery.isPending) {
    return (
      <Screen>
        <ScreenHeader title="Order details" icon="cube-outline" />
        <View style={styles.content}>
          {[0, 1, 2].map((i) => (
            <Card key={i} style={styles.skeletonCard}>
              <Skeleton width="45%" height={16} />
              <SkeletonLines lines={3} />
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen>
        <ScreenHeader title="Order details" icon="cube-outline" />
        <EmptyState
          icon={orderQuery.isError ? 'cloud-offline-outline' : 'search-outline'}
          title={orderQuery.isError ? "Couldn't load this order" : 'Order not found'}
          message={orderQuery.isError ? 'Check your connection and try again.' : undefined}
          actionLabel={orderQuery.isError ? 'Retry' : 'Back to orders'}
          onAction={() =>
            orderQuery.isError ? orderQuery.refetch() : navigation.navigate('MainTabs', { screen: 'OrdersTab' })
          }
        />
      </Screen>
    );
  }

  const status = ORDER_STATUS_BADGE[order.orderStatus] ?? { label: order.orderStatus, tone: 'neutral' as const };
  const payment = PAYMENT_STATUS_BADGE[order.paymentStatus] ?? PAYMENT_STATUS_BADGE.pending;
  const eta = getDetailEta(order);
  const bill = getBillBreakdown(order);
  const address = getDeliveryAddress(order);
  const cancellable = canCancelOrder(order.orderStatus);
  const itemCount = order.items?.length ?? 0;

  const confirmCancel = () =>
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone and the order will be permanently cancelled.`,
      [
        { text: 'No, Keep Order', style: 'cancel' },
        { text: 'Yes, Cancel Order', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ],
    );

  const helpMessage = `Hi, I need help with my order #${order.orderNumber} placed on ${formatOrderDate(order.createdAt)} (${formatAmount(order.totalAmount)}).`;

  return (
    <Screen>
      <ScreenHeader
        title={`Order #${order.orderNumber}`}
        icon="cube-outline"
        subtitle={`Placed on ${formatOrderDate(order.createdAt)}`}
        actions={
          order.orderStatus !== 'cancelled'
            ? [{ icon: 'document-text-outline', onPress: () => setInvoiceOpen(true), accessibilityLabel: 'View GST invoice' }]
            : undefined
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Status */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="h3" weight="bold">
              Order status
            </Text>
            <Badge label={status.label} tone={status.tone} size="md" />
          </View>
          {eta && (
            <View style={[styles.eta, eta.tone === 'success' ? styles.etaSuccess : styles.etaInfo]}>
              <Icon name="time-outline" size={20} color={eta.tone === 'success' ? 'successDark' : 'secondaryDark'} />
              <View>
                <Text variant="caption" color="textSecondary">
                  {eta.caption}
                </Text>
                <Text variant="title" weight="bold" color={eta.tone === 'success' ? 'successDark' : 'text'}>
                  {eta.label}
                </Text>
              </View>
            </View>
          )}
          <OrderProgress order={order} />
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <SectionTitle icon="bag-handle-outline" title={`${itemCount} ${itemCount === 1 ? 'item' : 'items'} in this order`} />
          {order.items?.map((item, index) => {
            const product = getItemProduct(item);
            const itemStatus = ORDER_STATUS_BADGE[item.itemStatus];
            const openProduct = product.id
              ? () => navigation.navigate('ProductDetail', { productId: product.id as string })
              : undefined;
            return (
              <View key={item._id ?? index}>
                {index > 0 && <Divider style={styles.itemDivider} />}
                <Pressable
                  style={styles.item}
                  onPress={openProduct}
                  disabled={!openProduct}
                  accessibilityRole={openProduct ? 'button' : undefined}
                  accessibilityLabel={item.productName}
                >
                  <Image uri={product.image} style={styles.itemImage} accessibilityLabel={item.productName} />
                  <View style={styles.flex}>
                    <Text variant="title" weight="semibold" numberOfLines={2}>
                      {item.productName || 'Unknown Product'}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {item.quantity || 0} × {formatAmount(item.unitPrice)}
                      {item.unit ? ` / ${item.unit}` : ''}
                    </Text>
                    {item.sku ? (
                      <Text variant="micro" color="textMuted">
                        SKU: {item.sku}
                      </Text>
                    ) : null}
                    {itemStatus && itemCount > 1 ? (
                      <Badge label={itemStatus.label} tone={itemStatus.tone} style={styles.itemBadge} />
                    ) : null}
                  </View>
                  <Text variant="title" weight="bold">
                    {formatAmount(getItemLineTotal(item))}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </Card>

        {/* Bill */}
        <Card style={styles.card}>
          <SectionTitle icon="receipt-outline" title="Bill details" />
          {bill.lines.map((line) => (
            <View key={line.label} style={styles.rowBetween}>
              <Text variant="bodySm" color={line.emphasis ? 'text' : 'textSecondary'} weight={line.emphasis ? 'semibold' : undefined}>
                {line.label}
              </Text>
              {line.free && line.value === 0 ? (
                <Text variant="bodySm" weight="bold" color="success">
                  FREE
                </Text>
              ) : (
                <Text variant="bodySm" weight={line.emphasis ? 'bold' : 'semibold'}>
                  {formatAmount(line.value)}
                </Text>
              )}
            </View>
          ))}
          <Divider />
          <View style={styles.rowBetween}>
            <Text variant="h3" weight="bold">
              Total amount
            </Text>
            <Text variant="h3" weight="extrabold">
              {formatAmount(bill.total)}
            </Text>
          </View>
          {order.orderStatus !== 'cancelled' && (
            <Pressable
              onPress={() => setInvoiceOpen(true)}
              style={({ pressed }) => [styles.invoiceRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="View GST invoice"
            >
              <Icon name="document-text-outline" size={18} color="primary" />
              <Text variant="label" weight="semibold" color="primary" style={styles.flex}>
                View / share GST invoice
              </Text>
              <Icon name="chevron-forward" size={16} color="primary" />
            </Pressable>
          )}
        </Card>

        {/* Address */}
        <Card style={styles.card}>
          <SectionTitle icon="location-outline" title="Delivery address" />
          <InfoLine icon="person-outline" text={address?.fullName || order.customerName || ''} strong />
          <InfoLine icon="call-outline" text={address?.phoneNumber || order.customerPhone} />
          <InfoLine
            icon="home-outline"
            text={
              address
                ? `${[address.addressLine1, address.addressLine2, address.landmark].filter(Boolean).join(', ')}\n${address.area}, ${address.city}, ${address.state} - ${address.pincode}`
                : `${order.customerAddress}${order.customerArea ? `, ${order.customerArea}` : ''}`
            }
          />
        </Card>

        {/* Payment */}
        <Card style={styles.card}>
          <SectionTitle icon="wallet-outline" title="Payment" />
          <View style={styles.rowBetween}>
            <Text variant="bodySm" color="textSecondary">
              {paymentMethodLabel(order.paymentMethod)}
            </Text>
            <Badge label={payment.label} tone={payment.tone} size="md" />
          </View>
        </Card>

        {/* Activity */}
        <Card style={styles.card}>
          <SectionTitle icon="git-commit-outline" title="Order activity" />
          <OrderTimeline
            events={lifecycleQuery.data}
            loading={lifecycleQuery.isPending && lifecycleQuery.fetchStatus !== 'idle'}
            error={lifecycleQuery.isError}
            statusHistory={order.statusHistory}
            onRetry={() => lifecycleQuery.refetch()}
          />
        </Card>

        {/* Help */}
        <Card style={styles.card}>
          <SectionTitle icon="help-buoy-outline" title="Need help with this order?" />
          <View style={styles.helpRow}>
            <Button
              title="WhatsApp"
              variant="whatsapp"
              size="sm"
              leftIcon="logo-whatsapp"
              style={styles.flex}
              onPress={() =>
                openExternal(
                  support.number ? `https://wa.me/${support.number}?text=${encodeURIComponent(helpMessage)}` : null,
                  'WhatsApp support is not available right now',
                )
              }
            />
            <Button
              title="Call us"
              variant="outline"
              size="sm"
              leftIcon="call-outline"
              style={styles.flex}
              onPress={() =>
                support.callNumber ? callPhone(support.callNumber) : openExternal(null, 'Call support is not available right now')
              }
            />
          </View>
        </Card>

        {/* Cancel */}
        {cancellable && (
          <View style={styles.cancel}>
            <Button
              title={cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
              variant="danger"
              leftIcon="close-circle-outline"
              fullWidth
              loading={cancelMutation.isPending}
              onPress={confirmCancel}
            />
            <Text variant="caption" color="textMuted" align="center">
              Note: Orders that have been delivered cannot be cancelled
            </Text>
          </View>
        )}
      </ScrollView>

      <InvoiceModal visible={invoiceOpen} onClose={() => setInvoiceOpen(false)} order={order} />
    </Screen>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} size={18} color="primary" />
      <Text variant="h3" weight="bold">
        {title}
      </Text>
    </View>
  );
}

function InfoLine({ icon, text, strong }: { icon: IconName; text: string; strong?: boolean }) {
  return (
    <View style={styles.infoLine}>
      <Icon name={icon} size={16} color="textMuted" />
      <Text variant="bodySm" color={strong ? 'text' : 'textSecondary'} weight={strong ? 'semibold' : undefined} style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SCREEN_PADDING, gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.lg },
  skeletonCard: { gap: spacing.md, padding: spacing.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  etaSuccess: { backgroundColor: colors.successSoft, borderColor: colors.success },
  etaInfo: { backgroundColor: colors.secondarySoft, borderColor: colors.secondary },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  itemDivider: { marginBottom: spacing.md },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemBadge: { marginTop: spacing.xs },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  pressed: { opacity: 0.8 },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  helpRow: { flexDirection: 'row', gap: spacing.md },
  cancel: { gap: spacing.sm, marginTop: spacing.sm },
});
