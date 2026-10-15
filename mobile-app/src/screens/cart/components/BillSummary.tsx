import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, Skeleton, Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import type { CartTotals } from '../../../types/models';
import { formatPrice } from '../../../utils/pricing';

interface FreeDeliveryInfo {
  /** Threshold delivery config is active and the subtotal reaches it. */
  isFree: boolean;
  /** Rupees still needed for free delivery (0 when not applicable). */
  remaining: number;
  /** 0..1 progress towards the threshold; null when there is no threshold. */
  progress: number | null;
  threshold: number;
}

/** Web Cart/Checkout: `breakdown.deliveryConfig.type === 'threshold'` drives the FREE badge and the "add ₹X more" hint. */
function getFreeDeliveryInfo(totals: CartTotals): FreeDeliveryInfo {
  const config = totals.breakdown?.deliveryConfig;
  if (!config || typeof config !== 'object' || !('type' in config) || config.type !== 'threshold') {
    return { isFree: false, remaining: 0, progress: null, threshold: 0 };
  }
  const rawThreshold = 'freeDeliveryThreshold' in config ? config.freeDeliveryThreshold : 0;
  const threshold = typeof rawThreshold === 'number' ? rawThreshold : 0;
  const isFree = totals.subtotal >= threshold;
  return {
    isFree,
    remaining: isFree ? 0 : threshold - totals.subtotal,
    progress: threshold > 0 ? Math.min(1, totals.subtotal / threshold) : null,
    threshold,
  };
}

export interface BillSummaryProps {
  /** Server totals from useCartTotals; undefined while the first request is in flight. */
  totals: CartTotals | undefined;
  /** A (re)fetch is in flight. */
  updating: boolean;
  /** Σ price × qty, shown as subtotal/total while server totals are loading (never guess GST/delivery). */
  fallbackSubtotal: number;
  itemCount: number;
  /** Checkout "I need a GST invoice": forces the GST breakdown even in no-display mode. */
  requireGSTBill?: boolean;
}

function Row({ label, value, muted, valueColor, children }: {
  label: string;
  value: string;
  muted?: boolean;
  valueColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text variant={muted ? 'bodySm' : 'body'} color={muted ? 'textMuted' : 'textSecondary'}>
          {label}
        </Text>
        {children}
      </View>
      <Text variant={muted ? 'bodySm' : 'body'} color={valueColor ?? (muted ? 'textMuted' : 'text')} weight={muted ? 'regular' : 'semibold'}>
        {value}
      </Text>
    </View>
  );
}

function FreeDeliveryProgress({ info }: { info: FreeDeliveryInfo }) {
  const { t } = useTranslation('cart');
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(info.progress ?? 0, { duration: 450 });
  }, [info.progress, width]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressText}>
        <Icon name={info.isFree ? 'checkmark-circle' : 'bicycle-outline'} size={16} color={info.isFree ? 'success' : 'primary'} />
        <Text variant="caption" color={info.isFree ? 'successDark' : 'primary'} weight="semibold" style={styles.flex}>
          {info.isFree
            ? t('bill.freeDeliveryUnlocked')
            : t('bill.freeDeliveryRemaining', { amount: formatPrice(info.remaining) })}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, info.isFree && styles.progressFillDone, fillStyle]} />
      </View>
    </View>
  );
}

/** Port of the web Cart/Checkout "Order Summary" totals block. All payable numbers come from the server. */
export function BillSummary({ totals, updating, fallbackSubtotal, itemCount, requireGSTBill = false }: BillSummaryProps) {
  const { t } = useTranslation('cart');
  const itemsLabel = t('bill.subtotalItems', { count: itemCount });

  if (!totals) {
    return (
      <View style={styles.wrap}>
        <Row label={itemsLabel} value={formatPrice(fallbackSubtotal)} />
        <View style={styles.skeletons}>
          <Skeleton width="60%" height={12} />
          <Skeleton width="45%" height={12} />
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text variant="h3">{t('bill.total')}</Text>
          <View style={styles.totalRight}>
            <Text variant="h2">{formatPrice(fallbackSubtotal)}</Text>
            <Text variant="micro" color="primary">{t('bill.updating')}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Server breakdown has no gstDisplayMode today; kept for web parity (undefined ⇒ breakdown shown).
  const gstDisplayMode = totals.breakdown?.gstDisplayMode;
  const showGst = (gstDisplayMode !== 'no-display' || requireGSTBill) && totals.tax > 0;
  const delivery = getFreeDeliveryInfo(totals);
  const halfGst = totals.tax / 2;

  return (
    <View style={styles.wrap}>
      <Row label={itemsLabel} value={formatPrice(totals.subtotal)} />

      {showGst && (
        <View style={styles.gstBlock}>
          {!!totals.subtotalBeforeGST && <Row muted label={t('bill.baseAmount')} value={formatPrice(totals.subtotalBeforeGST)} />}
          <Row muted label={totals.gstBreakdown?.mode === 'exclusive' ? t('bill.gst') : t('bill.gstIncluded')} value={formatPrice(totals.tax)} />
          <Row muted label="   CGST" value={`₹${halfGst.toFixed(2)}`} />
          <Row muted label="   SGST" value={`₹${halfGst.toFixed(2)}`} />
        </View>
      )}

      <Row
        label={t('bill.delivery')}
        value={delivery.isFree ? '₹0' : formatPrice(totals.deliveryCharges)}
        valueColor={delivery.isFree ? colors.success : undefined}
      >
        {delivery.isFree && (
          <View style={styles.freeBadge}>
            <Text variant="micro" color="successDark" weight="bold">{t('bill.free')}</Text>
          </View>
        )}
      </Row>
      {delivery.progress !== null && delivery.threshold > 0 && <FreeDeliveryProgress info={delivery} />}

      {totals.platformFee > 0 && <Row label={t('bill.platformFee')} value={formatPrice(totals.platformFee)} />}

      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text variant="h3">{t('bill.total')}</Text>
        <View style={styles.totalRight}>
          <Text variant="h2">{formatPrice(totals.totalAmount)}</Text>
          {updating && <Text variant="micro" color="primary">{t('bill.updating')}</Text>}
        </View>
      </View>

      {gstDisplayMode === 'no-display' && !requireGSTBill && (
        <View style={styles.hint}>
          <Icon name="information-circle-outline" size={14} color="textMuted" />
          <Text variant="caption" color="textMuted" style={styles.flex}>
            {t('bill.gstIncludedHint')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  gstBlock: { gap: spacing.xxs, paddingLeft: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.border },
  skeletons: { gap: spacing.sm, paddingVertical: spacing.xs },
  freeBadge: { backgroundColor: colors.successSoft, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  progressWrap: { gap: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: radii.sm, padding: spacing.sm },
  progressText: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  progressTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.secondary },
  progressFillDone: { backgroundColor: colors.success },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: spacing.xs },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalRight: { alignItems: 'flex-end' },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
});
