import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Input, Skeleton, Text } from '../../../components/ui';
import { useLocation } from '../../../contexts/LocationContext';
import { useAvailableCities } from '../../../hooks/queries';
import { colors, radii, spacing } from '../../../theme';
import type { AvailableCity } from '../../../types/models';
import { areSameCities } from '../../../utils/cityName';

export interface CityPickerProps {
  /** Called after merchants were loaded for the tapped city, with the merchant count. */
  onPicked?: (merchantCount: number) => void;
}

/**
 * Serviceable-city list with search (web Header city dropdown / ProductList CitySelectorScreen).
 * Selecting a city runs fetchMerchantsByCity, which persists it and toasts the result.
 */
export function CityPicker({ onPicked }: CityPickerProps) {
  const { selectedCity, fetchMerchantsByCity } = useLocation();
  const { data: cities = [], isLoading, isError, refetch } = useAvailableCities();
  const [search, setSearch] = useState('');
  const [pendingCity, setPendingCity] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q));
  }, [cities, search]);

  const pick = async (city: AvailableCity) => {
    if (pendingCity) return;
    setPendingCity(city.city);
    try {
      const count = await fetchMerchantsByCity(city.city, city.state);
      onPicked?.(count);
    } finally {
      setPendingCity(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Input
        leftIcon="search"
        placeholder="Search city..."
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        accessibilityLabel="Search city"
      />
      <View style={styles.list}>
        {isLoading ? (
          [0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <View style={styles.flex}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="30%" height={11} style={styles.skeletonSub} />
              </View>
              <Skeleton width={56} height={12} />
            </View>
          ))
        ) : isError ? (
          <Pressable onPress={() => refetch()} style={styles.message} accessibilityRole="button">
            <Icon name="refresh" size={28} color="textMuted" />
            <Text variant="bodySm" color="textSecondary" align="center">
              Couldn't load cities. Tap to retry.
            </Text>
          </Pressable>
        ) : filtered.length === 0 ? (
          <View style={styles.message}>
            <Icon name="location-outline" size={32} color="borderStrong" />
            <Text variant="bodySm" color="textSecondary" align="center">
              {search.trim() ? `No cities match "${search.trim()}"` : 'No cities available yet'}
            </Text>
          </View>
        ) : (
          filtered.map((city, index) => {
            const selected = !!selectedCity && areSameCities(selectedCity.city, city.city);
            const pending = pendingCity === city.city;
            return (
              <Pressable
                key={`${city.city}-${city.state}`}
                onPress={() => pick(city)}
                disabled={!!pendingCity}
                accessibilityRole="button"
                accessibilityState={{ selected, busy: pending }}
                accessibilityLabel={`${city.city}, ${city.state}, ${city.merchantCount} stores`}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.rowBorder,
                  selected && styles.rowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cityIcon}>
                  <Icon name="business-outline" size={18} color={selected ? 'primary' : 'textSecondary'} />
                </View>
                <View style={styles.flex}>
                  <Text variant="title" weight={selected ? 'bold' : 'semibold'}>
                    {city.city}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {city.state}
                  </Text>
                </View>
                <Text variant="caption" color="successDark" weight="bold">
                  {city.merchantCount} {city.merchantCount === 1 ? 'store' : 'stores'}
                </Text>
                {pending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : selected ? (
                  <Icon name="checkmark-circle" size={20} color="primary" />
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  flex: { flex: 1 },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowSelected: { backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.surfaceMuted },
  cityIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonSub: { marginTop: spacing.xs },
  message: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
});
