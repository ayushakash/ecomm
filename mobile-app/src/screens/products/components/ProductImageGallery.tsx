import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type FlatList, type ListRenderItem, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Badge, Image, Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';

export interface ProductImageGalleryHandle {
  scrollTo(index: number): void;
}

interface ProductImageGalleryProps {
  images: string[];
  name: string;
  width: number;
  outOfStock: boolean;
  onOpen(index: number): void;
}

/** Full-bleed square pager with animated dots, counter and the web's out-of-stock overlay. Tap opens the zoom viewer. */
export const ProductImageGallery = forwardRef<ProductImageGalleryHandle, ProductImageGalleryProps>(
  function ProductImageGallery({ images, name, width, outOfStock, onOpen }, ref) {
    const { t } = useTranslation('products');
    const listRef = useRef<FlatList<string>>(null);
    const [index, setIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const slides = images.length ? images : [''];
    const multiple = slides.length > 1;

    useImperativeHandle(ref, () => ({
      scrollTo(next) {
        if (next === index || next < 0 || next >= slides.length) return;
        listRef.current?.scrollToIndex({ index: next, animated: false });
        setIndex(next);
      },
    }));

    const onScroll = useAnimatedScrollHandler((e) => {
      scrollX.value = e.contentOffset.x;
    });

    const onMomentumEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width)),
      [width],
    );

    const renderItem = useCallback<ListRenderItem<string>>(
      ({ item, index: i }) => (
        <Pressable
          onPress={() => onOpen(i)}
          disabled={!item}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('gallery.slideA11y', { name, index: i + 1, total: slides.length })}
        >
          <Image
            uri={item}
            style={{ width, height: width }}
            contentFit="contain"
            priority={i === 0 ? 'high' : 'normal'}
            accessibilityLabel={t('gallery.imageA11y', { name, index: i + 1 })}
          />
        </Pressable>
      ),
      [name, onOpen, slides.length, width, t],
    );

    return (
      <View style={[styles.wrap, { width, height: width }]}>
        <Animated.FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={multiple}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />

        {outOfStock && (
          <View style={styles.oos} pointerEvents="none">
            <Badge label={t('stock.outOfStock')} tone="danger" solid size="md" style={styles.oosBadge} />
          </View>
        )}

        {multiple && (
          <>
            <View style={styles.counter} pointerEvents="none">
              <Text variant="micro" weight="bold" color="textInverse">
                {index + 1} / {slides.length}
              </Text>
            </View>
            <View style={styles.dots} pointerEvents="none">
              {slides.map((_, i) => (
                <Dot key={i} index={i} scrollX={scrollX} width={width} />
              ))}
            </View>
          </>
        )}

        {!!images.length && (
          <View style={styles.zoomHint} pointerEvents="none">
            <Text variant="micro" weight="semibold" color="textSecondary">
              {t('gallery.tapToZoom')}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const pos = scrollX.value / width;
    const range = [index - 1, index, index + 1];
    return {
      width: interpolate(pos, range, [6, 18, 6], Extrapolation.CLAMP),
      opacity: interpolate(pos, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, overflow: 'hidden' },
  oos: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oosBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  counter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  zoomHint: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
