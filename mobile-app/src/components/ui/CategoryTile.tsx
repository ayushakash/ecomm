import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import type { Category } from '../../types/models';
import { useCategoryCovers } from '../../hooks/queries';
import { getCategoryVisual } from '../../utils/categoryVisuals';
import { Image } from './Image';
import { Text } from './Text';

export interface CategoryTileProps {
  category: Pick<Category, '_id' | 'name' | 'image'>;
  onPress: () => void;
  selected?: boolean;
  /** Tile width (default 64; use ~ (screen - padding) / 5 for a 5-col grid). */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Category tile: real product photo (or small icon fallback) + 2-line label. */
export function CategoryTile({ category, onPress, selected = false, size = 64, style }: CategoryTileProps) {
  const visual = getCategoryVisual(category.name);
  const covers = useCategoryCovers();
  const imageUri = category.image || covers.get(category._id);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={category.name}
      style={({ pressed }) => [{ width: size }, styles.wrap, pressed && { opacity: 0.8 }, style]}
    >
      <View
        style={[
          styles.square,
          { width: size, height: size, backgroundColor: visual.tint },
          selected && { borderColor: colors.primary },
        ]}
      >
        {imageUri ? (
          <Image uri={imageUri} style={styles.img} contentFit="cover" />
        ) : (
          <MaterialCommunityIcons name={visual.icon} size={Math.round(size * 0.38)} color={visual.color} />
        )}
      </View>
      <Text variant="caption" weight={selected ? 'extrabold' : 'semibold'} align="center" numberOfLines={2} style={styles.label}>
        {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  square: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  label: { fontSize: 11, lineHeight: 14 },
});
