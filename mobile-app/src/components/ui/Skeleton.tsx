import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '../../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  /** Perfect circle of `size` (avatars, icons). */
  circle?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block. Compose into screen-specific skeletons. */
export function Skeleton({ width = '100%', height = 14, radius = radii.sm, circle, style }: SkeletonProps) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const dims = circle ? { width: circle, height: circle, borderRadius: circle / 2 } : { width, height, borderRadius: radius };
  return <Animated.View style={[styles.block, dims, animated, style]} />;
}

/** Vertical stack of text-line skeletons; last line shorter. */
export function SkeletonLines({ lines = 3, gap = spacing.sm, lineHeight = 12 }: { lines?: number; gap?: number; lineHeight?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.skeleton },
});
