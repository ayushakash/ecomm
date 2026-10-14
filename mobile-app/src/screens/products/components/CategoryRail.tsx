import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CategoryTile, Skeleton, Text } from '../../../components/ui';
import { colors, radii, SCREEN_PADDING, spacing } from '../../../theme';
import type { Category } from '../../../types/models';

const TILE = 60;

export interface CategoryRailProps {
  categories: Category[] | undefined;
  loading?: boolean;
  /** '' = all products. */
  selectedId: string;
  onSelect: (categoryId: string) => void;
}

/** Horizontal "All + category" tile rail; keeps the selected tile scrolled into view. */
export function CategoryRail({ categories, loading, selectedId, onSelect }: CategoryRailProps) {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  useEffect(() => {
    const x = offsets.current[selectedId];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - SCREEN_PADDING * 2), animated: true });
  }, [selectedId, categories]);

  const select = (id: string) => {
    if (id === selectedId) return;
    Haptics.selectionAsync().catch(() => {});
    onSelect(id);
  };

  const allSelected = selectedId === '';

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Pressable
        onPress={() => select('')}
        onLayout={(e) => {
          offsets.current[''] = e.nativeEvent.layout.x;
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: allSelected }}
        accessibilityLabel="All products"
        style={({ pressed }) => [styles.allWrap, pressed && styles.pressed]}
      >
        <View style={[styles.allSquare, allSelected && styles.allSquareSelected]}>
          <MaterialCommunityIcons
            name="view-grid-outline"
            size={TILE * 0.45}
            color={allSelected ? colors.onPrimary : colors.primary}
          />
        </View>
        <Text variant="caption" weight={allSelected ? 'extrabold' : 'semibold'} align="center" numberOfLines={2}>
          All
        </Text>
      </Pressable>
      {loading && !categories
        ? [0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeleton}>
              <Skeleton width={TILE} height={TILE} radius={radii.lg} />
              <Skeleton width={TILE - 12} height={10} />
            </View>
          ))
        : categories?.map((category) => (
            <View
              key={category._id}
              onLayout={(e) => {
                offsets.current[category._id] = e.nativeEvent.layout.x;
              }}
            >
              <CategoryTile
                category={category}
                size={TILE}
                selected={category._id === selectedId}
                onPress={() => select(category._id)}
              />
            </View>
          ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md, paddingVertical: spacing.sm },
  allWrap: { width: TILE, alignItems: 'center', gap: spacing.xs + 2 },
  allSquare: {
    width: TILE,
    height: TILE,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  allSquareSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  skeleton: { width: TILE, alignItems: 'center', gap: spacing.xs + 2 },
});
