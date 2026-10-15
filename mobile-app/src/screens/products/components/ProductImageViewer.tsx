import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon, Image, Text } from '../../../components/ui';
import { colors, layout, radii, spacing } from '../../../theme';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const THUMB = 56;

interface ProductImageViewerProps {
  visible: boolean;
  images: string[];
  name: string;
  initialIndex: number;
  onClose(lastIndex: number): void;
}

/** Full-screen lightbox (web isFullscreen): swipe between images, pinch / double-tap to zoom, pan while zoomed, thumbnail strip. */
export function ProductImageViewer({ visible, images, name, initialIndex, onClose }: ProductImageViewerProps) {
  const { t } = useTranslation('products');
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [pageHeight, setPageHeight] = useState(height);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setZoomed(false);
    }
  }, [visible, initialIndex]);

  const goTo = useCallback((next: number) => {
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
    setZoomed(false);
  }, []);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next !== index) {
        setIndex(next);
        setZoomed(false);
      }
    },
    [index, width],
  );

  const close = () => onClose(index);
  const multiple = images.length > 1;

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item, index: i }) => (
      <ZoomableImage uri={item} width={width} height={pageHeight} active={i === index} onZoomChange={setZoomed} label={t('gallery.imageA11y', { name, index: i + 1 })} />
    ),
    [index, name, pageHeight, width, t],
  );

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent transparent={false}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text variant="title" weight="semibold" color="textInverse" numberOfLines={1} style={styles.title}>
            {name}
          </Text>
          {multiple && (
            <Text variant="bodySm" color="textMuted">
              {index + 1} / {images.length}
            </Text>
          )}
          <Pressable
            onPress={close}
            hitSlop={layout.hitSlop}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('gallery.closeViewer')}
          >
            <Icon name="close" size={26} color="textInverse" />
          </Pressable>
        </View>

        <View style={styles.pager} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
          {visible && (
            <FlatList
              ref={listRef}
              data={images}
              keyExtractor={(uri, i) => `${i}-${uri}`}
              renderItem={renderItem}
              horizontal
              pagingEnabled
              scrollEnabled={multiple && !zoomed}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(initialIndex, Math.max(images.length - 1, 0))}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={onMomentumEnd}
              extraData={index}
            />
          )}

          {multiple && !zoomed && (
            <>
              <ArrowButton side="left" onPress={() => goTo(index === 0 ? images.length - 1 : index - 1)} />
              <ArrowButton side="right" onPress={() => goTo(index === images.length - 1 ? 0 : index + 1)} />
            </>
          )}
        </View>

        {multiple && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbScroll}
            contentContainerStyle={[styles.thumbs, { paddingBottom: insets.bottom + spacing.md }]}
          >
            {images.map((uri, i) => (
              <Pressable
                key={`${i}-${uri}`}
                onPress={() => goTo(i)}
                style={[styles.thumb, i === index && styles.thumbActive]}
                accessibilityRole="button"
                accessibilityLabel={t('gallery.showImage', { index: i + 1 })}
                accessibilityState={{ selected: i === index }}
              >
                <Image uri={uri} style={styles.thumbImg} recyclingKey={uri} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

function ArrowButton({ side, onPress }: { side: 'left' | 'right'; onPress(): void }) {
  const { t } = useTranslation('products');
  return (
    <Pressable
      onPress={onPress}
      style={[styles.arrow, side === 'left' ? styles.arrowLeft : styles.arrowRight]}
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? t('gallery.previous') : t('gallery.next')}
    >
      <Icon name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={24} color="textInverse" />
    </Pressable>
  );
}

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  active: boolean;
  label: string;
  onZoomChange(zoomed: boolean): void;
}

function ZoomableImage({ uri, width, height, active, label, onZoomChange }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [panEnabled, setPanEnabled] = useState(false);

  const reportZoom = useCallback(
    (z: boolean) => {
      setPanEnabled(z);
      onZoomChange(z);
    },
    [onZoomChange],
  );

  // Swiping away resets the page so it reopens unzoomed.
  useEffect(() => {
    if (!active) {
      scale.value = 1;
      savedScale.value = 1;
      tx.value = 0;
      ty.value = 0;
      savedTx.value = 0;
      savedTy.value = 0;
      setPanEnabled(false);
    }
  }, [active, savedScale, savedTx, savedTy, scale, tx, ty]);

  const clampTranslate = (value: number, s: number, size: number) => {
    'worklet';
    const max = (size * (s - 1)) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(reportZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.8, savedScale.value * e.scale));
      tx.value = clampTranslate(savedTx.value, scale.value, width);
      ty.value = clampTranslate(savedTy.value, scale.value, height);
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      runOnJS(reportZoom)(true);
    });

  const pan = Gesture.Pan()
    .enabled(panEnabled)
    .averageTouches(true)
    .onUpdate((e) => {
      tx.value = clampTranslate(savedTx.value + e.translationX, scale.value, width);
      ty.value = clampTranslate(savedTy.value + e.translationY, scale.value, height);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (savedScale.value > 1) {
        reset();
        return;
      }
      // Zoom toward the tapped point.
      const next = DOUBLE_TAP_SCALE;
      const targetX = clampTranslate((width / 2 - e.x) * (next - 1), next, width);
      const targetY = clampTranslate((height / 2 - e.y) * (next - 1), next, height);
      scale.value = withTiming(next);
      tx.value = withTiming(targetX);
      ty.value = withTiming(targetY);
      savedScale.value = next;
      savedTx.value = targetX;
      savedTy.value = targetY;
      runOnJS(reportZoom)(true);
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.page, { width, height }]} collapsable={false}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Image uri={uri} style={[styles.full, { width, height }]} contentFit="contain" accessibilityLabel={label} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: layout.headerHeight,
  },
  title: { flex: 1 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1 },
  page: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  full: { backgroundColor: 'transparent' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: spacing.md },
  arrowRight: { right: spacing.md },
  thumbScroll: { flexGrow: 0 },
  thumbs: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexGrow: 1, justifyContent: 'center' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  thumbActive: { borderColor: colors.textInverse },
  thumbImg: { width: '100%', height: '100%' },
});
