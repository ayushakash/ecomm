import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing, type ColorValue } from '../../theme';
import { formatPrice, getDiscountPercent } from '../../utils/pricing';
import { Badge } from './Badge';
import { Text } from './Text';

export interface PriceTextProps {
  amount: number;
  /** Printed MRP; shown struck-through when higher than amount, with "% OFF". */
  mrp?: number;
  /** Appended as "/bag". */
  unit?: string;
  /** Leading label, e.g. "From" for variant products. */
  prefix?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: ColorValue;
  /** Hide the "% OFF" pill even when MRP is higher. */
  hideDiscount?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE = {
  sm: { variant: 'title', sub: 'micro' },
  md: { variant: 'price', sub: 'caption' },
  lg: { variant: 'h2', sub: 'caption' },
  xl: { variant: 'h1', sub: 'bodySm' },
} as const;

/** ₹ amount (en-IN grouping) with optional MRP strike, unit and discount pill. */
export function PriceText({ amount, mrp, unit, prefix, size = 'md', color = 'text', hideDiscount, style }: PriceTextProps) {
  const s = SIZE[size];
  const discount = getDiscountPercent(amount, mrp);
  return (
    <View style={[styles.row, style]}>
      {prefix && (
        <Text variant={s.sub} color="textMuted" weight="semibold">
          {prefix}
        </Text>
      )}
      <Text variant={s.variant} weight="extrabold" color={color}>
        {formatPrice(amount)}
      </Text>
      {unit ? (
        <Text variant={s.sub} color="textMuted" weight="semibold">
          /{unit}
        </Text>
      ) : null}
      {discount > 0 && (
        <Text variant={s.sub} color="textMuted" strike>
          {formatPrice(mrp ?? 0)}
        </Text>
      )}
      {discount > 0 && !hideDiscount && <Badge label={`${discount}% OFF`} tone="success" />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.xs, rowGap: 2 },
});
