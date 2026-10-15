import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import type { ProductVariant } from '../../../types/models';
import { formatPrice } from '../../../utils/pricing';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedLabel: string | null;
  unit?: string;
  onSelect(variant: ProductVariant): void;
}

/** Web "Select Size": each chip carries its own price; out-of-stock sizes are struck and disabled. */
export function VariantSelector({ variants, selectedLabel, unit, onSelect }: VariantSelectorProps) {
  const { t } = useTranslation('products');
  const selected = variants.find((v) => v.label === selectedLabel);
  return (
    <View>
      <View style={styles.titleRow}>
        <Text variant="title" weight="bold">
          {t('variant.title')}
        </Text>
        {!selected && (
          <Text variant="caption" color="danger" weight="semibold">
            {t('variant.required')}
          </Text>
        )}
      </View>
      <View style={styles.grid}>
        {variants.map((variant) => {
          const isSelected = variant.label === selectedLabel;
          const soldOut = variant.stock <= 0;
          return (
            <Pressable
              key={variant.label}
              onPress={() => onSelect(variant)}
              disabled={soldOut}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: soldOut }}
              accessibilityLabel={`${variant.label}, ${soldOut ? t('stock.outOfStockLower') : formatPrice(variant.price)}`}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                soldOut && styles.chipSoldOut,
                pressed && !isSelected && styles.chipPressed,
              ]}
            >
              <Text variant="label" weight="bold" color={soldOut ? 'textMuted' : isSelected ? 'primary' : 'text'} strike={soldOut}>
                {variant.label}
              </Text>
              <Text variant="caption" weight="semibold" color={soldOut ? 'danger' : isSelected ? 'primary' : 'textSecondary'}>
                {soldOut ? t('stock.outOfStockLower') : formatPrice(variant.price)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected && (
        <Text variant="caption" color="textSecondary" style={styles.stock}>
          {t('variant.stock', { count: selected.stock, unit: unit ?? '' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 76,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipSoldOut: { backgroundColor: colors.surfaceMuted, borderStyle: 'dashed' },
  chipPressed: { backgroundColor: colors.primarySoft },
  stock: { marginTop: spacing.sm },
});
