import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Icon, Image, ORDER_STATUS_BADGE, Skeleton, Text } from '../../../components/ui';
import { colors, radii, shadows, spacing } from '../../../theme';
import type { Order } from '../../../types/models';
import { formatAmount, formatOrderDate, getItemProduct, getListEta, orderStatusLabel } from './orderUtils';

const MAX_THUMBS = 4;

export interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
}

/** Order history row: number, date, status, item thumbnails, total and the web ETA chip. */
export const OrderCard = memo(function OrderCard({ order, onPress }: OrderCardProps) {
  const { t } = useTranslation('orders');
  const status = { label: orderStatusLabel(order.orderStatus), tone: ORDER_STATUS_BADGE[order.orderStatus]?.tone ?? ('neutral' as const) };
  const eta = getListEta(order);
  const items = order.items ?? [];
  const extra = items.length - MAX_THUMBS;
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const names = items.map((item) => item.productName).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('card.a11y', { number: order.orderNumber, status: status.label, amount: formatAmount(order.totalAmount) })}
      onPress={() => onPress(order)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="title" weight="bold" numberOfLines={1}>
            {t('orderNumber', { number: order.orderNumber })}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatOrderDate(order.createdAt)}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} size="md" />
      </View>

      <View style={styles.thumbs}>
        {items.slice(0, MAX_THUMBS).map((item, index) => (
          <Image
            key={item._id ?? index}
            uri={getItemProduct(item).image}
            style={styles.thumb}
            accessibilityLabel={item.productName}
            recyclingKey={`${order._id}-${index}`}
          />
        ))}
        {extra > 0 && (
          <View style={[styles.thumb, styles.more]}>
            <Text variant="label" weight="bold" color="textSecondary">
              +{extra}
            </Text>
          </View>
        )}
      </View>

      <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
        {names}
      </Text>

      {eta && (
        <View style={[styles.eta, { backgroundColor: ETA_BG[eta.tone] }]}>
          <Icon name="time-outline" size={14} color={ETA_FG[eta.tone]} />
          <Text variant="caption" weight="semibold" style={{ color: ETA_FG[eta.tone] }}>
            {eta.label}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text variant="bodySm" color="textSecondary">
          {t('itemCount', { count: itemCount })} ·{' '}
          <Text variant="bodySm" weight="bold">
            {formatAmount(order.totalAmount)}
          </Text>
        </Text>
        <View style={styles.link}>
          <Text variant="label" weight="semibold" color="primary">
            {t('card.viewDetails')}
          </Text>
          <Icon name="chevron-forward" size={16} color="primary" />
        </View>
      </View>
    </Pressable>
  );
});

const ETA_BG = { success: colors.successSoft, info: colors.infoSoft, primary: colors.primarySoft } as const;
const ETA_FG = { success: colors.successDark, info: colors.info, primary: colors.primary } as const;

export function OrderCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.flex, styles.skeletonGap]}>
          <Skeleton width="55%" height={16} />
          <Skeleton width="30%" height={12} />
        </View>
        <Skeleton width={84} height={24} radius={radii.pill} />
      </View>
      <View style={styles.thumbs}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={52} height={52} radius={radii.sm} />
        ))}
      </View>
      <Skeleton width="80%" height={12} />
      <View style={styles.footer}>
        <Skeleton width="35%" height={14} />
        <Skeleton width={90} height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  skeletonGap: { gap: spacing.xs + 2 },
  thumbs: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  more: { alignItems: 'center', justifyContent: 'center' },
  eta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
