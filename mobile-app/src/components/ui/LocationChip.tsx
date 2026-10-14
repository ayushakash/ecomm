import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useLocation } from '../../contexts/LocationContext';
import type { RootNavigation } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface LocationChipProps {
  /** 'onDark' for the slate home header, 'onLight' for white bars. */
  tone?: 'onDark' | 'onLight';
  /** Default: open the LocationPicker modal. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** "Delivering to ▾ Home · Kanke" header chip (Blinkit-style), bound to LocationContext. */
export function LocationChip({ tone = 'onDark', onPress, style }: LocationChipProps) {
  const navigation = useNavigation<RootNavigation>();
  const { locationLabel, locationSubtitle, isLoadingMerchants } = useLocation();
  const fg = tone === 'onDark' ? colors.textInverse : colors.text;
  const sub = tone === 'onDark' ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress ?? (() => navigation.navigate('LocationPicker'))}
      accessibilityRole="button"
      accessibilityLabel={`Delivery location: ${locationLabel}. Change`}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.75 }, style]}
    >
      <View style={styles.topRow}>
        <Icon name="location" size={16} color={tone === 'onDark' ? colors.secondary : colors.primary} />
        <Text variant="caption" weight="bold" style={{ color: sub }}>
          Delivering to
        </Text>
        {isLoadingMerchants && <ActivityIndicator size="small" color={sub} style={styles.spinner} />}
      </View>
      <View style={styles.topRow}>
        <Text variant="h3" weight="extrabold" style={[styles.label, { color: fg }]} numberOfLines={1}>
          {locationLabel}
        </Text>
        <Icon name="chevron-down" size={16} color={fg} />
      </View>
      {!!locationSubtitle && (
        <Text variant="caption" style={{ color: sub }} numberOfLines={1}>
          {locationSubtitle}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 1, gap: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { flexShrink: 1 },
  spinner: { transform: [{ scale: 0.7 }] },
});
