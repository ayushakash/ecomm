import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ProductCardSkeleton } from '../../../components/ui';
import { SCREEN_PADDING, spacing } from '../../../theme';

/** Fixed ProductCard width for the 2-column grids (a lone last card must not stretch full-width). */
export function useGridCellWidth() {
  const { width } = useWindowDimensions();
  return Math.floor((width - SCREEN_PADDING * 2 - spacing.md) / 2);
}

/** 2-column ProductCardSkeleton grid matching the product FlatLists. */
export function ProductGridSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </View>
      ))}
    </View>
  );
}

export const gridStyles = StyleSheet.create({
  columns: { gap: spacing.md, paddingHorizontal: SCREEN_PADDING },
  separator: { height: spacing.md },
});

/** Vertical gap between grid rows (stable component identity for FlatList). */
export function GridSeparator() {
  return <View style={gridStyles.separator} />;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: SCREEN_PADDING },
});
