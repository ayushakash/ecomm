import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, Icon, Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import type { AvailableCity } from '../../../types/models';

interface Props {
  visible: boolean;
  onClose: () => void;
  cities: AvailableCity[];
  selected: string;
  onSelect: (city: string) => void;
}

/** Pricing-city picker (web header <select> of available cities). */
export function CityPickerSheet({ visible, onClose, cities, selected, onSelect }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Pricing city" subtitle="Market prices come from merchants in this city">
      <View style={styles.list}>
        {cities.map((c) => {
          const active = c.city === selected;
          return (
            <Pressable
              key={`${c.city}-${c.state}`}
              onPress={() => {
                onSelect(c.city);
                onClose();
              }}
              style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${c.city}, ${c.state}`}
            >
              <Icon name="location-outline" size={18} color={active ? 'primary' : 'textMuted'} />
              <View style={styles.flex}>
                <Text variant="title">{c.city}</Text>
                <Text variant="caption" color="textSecondary">
                  {c.state} · {c.merchantCount} {c.merchantCount === 1 ? 'merchant' : 'merchants'}
                </Text>
              </View>
              {active && <Icon name="checkmark-circle" size={20} color="success" />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  rowActive: { backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.surfaceMuted },
  flex: { flex: 1 },
});
