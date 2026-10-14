import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import type { OrderStatus } from '../../types/models';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'brand';

const TONES: Record<BadgeTone, { bg: string; fg: string; solidBg: string; solidFg: string }> = {
  neutral: { bg: colors.primarySoft, fg: colors.textSecondary, solidBg: colors.primaryLight, solidFg: colors.textInverse },
  primary: { bg: colors.primarySoft, fg: colors.primary, solidBg: colors.primary, solidFg: colors.onPrimary },
  secondary: { bg: colors.secondarySoft, fg: colors.secondaryDark, solidBg: colors.secondary, solidFg: colors.onSecondary },
  success: { bg: colors.successSoft, fg: colors.successDark, solidBg: colors.success, solidFg: colors.textInverse },
  danger: { bg: colors.dangerSoft, fg: colors.dangerDark, solidBg: colors.danger, solidFg: colors.textInverse },
  warning: { bg: colors.warningSoft, fg: colors.secondaryDark, solidBg: colors.warning, solidFg: colors.onSecondary },
  info: { bg: colors.infoSoft, fg: colors.info, solidBg: colors.info, solidFg: colors.textInverse },
  brand: { bg: colors.brandSoft, fg: colors.brand, solidBg: colors.brand, solidFg: colors.textInverse },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Filled background instead of soft tint. */
  solid?: boolean;
  icon?: IconName;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', solid = false, icon, size = 'sm', style }: BadgeProps) {
  const t = TONES[tone];
  const fg = solid ? t.solidFg : t.fg;
  return (
    <View
      style={[
        styles.badge,
        size === 'md' && styles.md,
        { backgroundColor: solid ? t.solidBg : t.bg },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={size === 'md' ? 13 : 11} color={fg} />}
      <Text variant={size === 'md' ? 'caption' : 'micro'} weight="bold" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Order/item status → badge label + tone (customer wording). */
export const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Placed', tone: 'warning' },
  approved: { label: 'Confirmed', tone: 'info' },
  assigned: { label: 'Confirmed', tone: 'info' },
  processing: { label: 'Packing', tone: 'info' },
  shipped: { label: 'Out for delivery', tone: 'primary' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

/** Small count bubble (tab icons, cart button). Hidden when count <= 0. */
export function CountBubble({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.bubble, style]}>
      <Text variant="micro" weight="extrabold" style={{ color: colors.onSecondary }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: spacing.sm - 1,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  md: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  bubble: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
