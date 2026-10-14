import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Icon, Input, Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import { EMPTY_PRICE_RANGE, PRICE_PRESETS, SORT_LABELS, type PriceRange, type SortOption } from './productFilters';

export interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sort options offered (Home: name/latest/price; ProductList: latest/price). */
  sortOptions: SortOption[];
  sortBy: SortOption;
  priceRange: PriceRange;
  onApply: (sort: SortOption, range: PriceRange) => void;
}

/** Sort + price-range bottom sheet (web Home price popover + ProductList sort select). */
export function FilterSheet({ visible, onClose, sortOptions, sortBy, priceRange, onApply }: FilterSheetProps) {
  const [draftSort, setDraftSort] = useState(sortBy);
  const [draftRange, setDraftRange] = useState(priceRange);

  // Reset the draft to the applied values every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setDraftSort(sortBy);
    setDraftRange(priceRange);
  }, [visible, sortBy, priceRange]);

  const apply = (sort: SortOption, range: PriceRange) => {
    Haptics.selectionAsync().catch(() => {});
    onApply(sort, range);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sort & filter"
      footer={
        <View style={styles.footer}>
          <Button
            title="Clear"
            variant="outline"
            style={styles.flex}
            onPress={() => apply(sortOptions[0], EMPTY_PRICE_RANGE)}
          />
          <Button title="Apply" style={styles.flex} onPress={() => apply(draftSort, draftRange)} />
        </View>
      }
    >
      <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
        SORT BY
      </Text>
      <View style={styles.sortList}>
        {sortOptions.map((option) => {
          const selected = option === draftSort;
          return (
            <Pressable
              key={option}
              onPress={() => setDraftSort(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.sortRow, pressed && styles.pressed]}
            >
              <Text variant="body" weight={selected ? 'bold' : 'medium'}>
                {SORT_LABELS[option]}
              </Text>
              <Icon
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? 'primary' : 'borderStrong'}
              />
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
        PRICE RANGE
      </Text>
      <View style={styles.presets}>
        {PRICE_PRESETS.map((preset) => {
          const selected = draftRange.min === preset.min && draftRange.max === preset.max;
          return (
            <Pressable
              key={preset.label}
              onPress={() => setDraftRange({ min: preset.min, max: preset.max })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.preset, selected && styles.presetSelected]}
            >
              <Text variant="label" color={selected ? 'primary' : 'text'} weight={selected ? 'bold' : 'semibold'}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.rangeRow}>
        <Input
          label="Min"
          placeholder="0"
          prefix="₹"
          keyboardType="number-pad"
          value={draftRange.min}
          onChangeText={(min) => setDraftRange((r) => ({ ...r, min: min.replace(/[^\d]/g, '') }))}
          containerStyle={styles.flex}
        />
        <Text variant="body" color="textMuted" style={styles.dash}>
          –
        </Text>
        <Input
          label="Max"
          placeholder="∞"
          prefix="₹"
          keyboardType="number-pad"
          value={draftRange.max}
          onChangeText={(max) => setDraftRange((r) => ({ ...r, max: max.replace(/[^\d]/g, '') }))}
          containerStyle={styles.flex}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.md },
  sectionLabel: { marginBottom: spacing.sm, letterSpacing: 0.6 },
  sortList: { marginBottom: spacing.xl },
  sortRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  preset: {
    flexBasis: '47%',
    flexGrow: 1,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  presetSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rangeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  dash: { paddingBottom: spacing.md },
});
