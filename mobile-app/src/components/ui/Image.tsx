import { Image as ExpoImage, type ImageContentFit } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { resolveImageUrl } from '../../config';
import { colors } from '../../theme';
import { Icon, type IconName } from './Icon';

export interface ImageProps {
  /** Remote URL or relative upload path (resolved against API origin). */
  uri?: string | null;
  /** Must set a size (width/height or aspectRatio). */
  style?: StyleProp<ViewStyle & ImageStyle>;
  contentFit?: ImageContentFit;
  /** Icon shown when uri is missing (default cube). */
  fallbackIcon?: IconName;
  /** Load eagerly (above-the-fold). */
  priority?: 'low' | 'normal' | 'high';
  accessibilityLabel?: string;
  /** Shared transition / list recycling key. */
  recyclingKey?: string;
}

/** expo-image with disk cache, fade-in, and an icon placeholder. */
export function Image({
  uri,
  style,
  contentFit = 'cover',
  fallbackIcon = 'cube-outline',
  priority = 'normal',
  accessibilityLabel,
  recyclingKey,
}: ImageProps) {
  const source = resolveImageUrl(uri);
  if (!source) {
    return (
      <View style={[styles.fallback, style]} accessibilityLabel={accessibilityLabel}>
        <Icon name={fallbackIcon} size={32} color="borderStrong" />
      </View>
    );
  }
  return (
    <ExpoImage
      source={{ uri: source }}
      style={[styles.image, style]}
      contentFit={contentFit}
      transition={180}
      cachePolicy="memory-disk"
      priority={priority}
      recyclingKey={recyclingKey}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  fallback: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
