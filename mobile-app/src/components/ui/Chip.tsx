import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Trailing chevron for dropdown-style chips (sort/filter). */
  dropdown?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Filter/selection pill (categories row, sort, variant sizes). */
export function Chip({ label, selected = false, onPress, icon, dropdown, style }: ChipProps) {
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && !selected && { backgroundColor: colors.primarySoft },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={15} color={fg} />}
      <Text variant="label" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {dropdown && <Icon name="chevron-down" size={14} color={fg} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
