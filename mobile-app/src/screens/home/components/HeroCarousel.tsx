import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Icon, Text, type IconName } from '../../../components/ui';
import { colors, palette, radii, SCREEN_PADDING, shadows, spacing } from '../../../theme';

const AUTOPLAY_MS = 4500;

export interface HeroSlide {
  key: string;
  /** Two-stop gradient (web hero radial #2C3E54 → #1E2A3A). */
  gradient: readonly [string, string];
  badge: string;
  title: string;
  /** Highlighted trailing part of the title (brand orange). */
  highlight?: string;
  body: string;
  pill?: { icon: IconName; label: string };
  cta?: { label: string; icon: IconName; onPress: () => void };
}

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 18 : 6, { duration: 220 }),
    opacity: withTiming(active ? 1 : 0.45, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Auto-advancing, swipeable hero banners (pauses while the tab is not focused or the user is dragging). */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - SCREEN_PADDING * 2;
  const listRef = useRef<FlatList<HeroSlide>>(null);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Tallest slide wins so every card (and the carousel) has one stable height.
  const [cardHeight, setCardHeight] = useState(0);
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused || dragging || slides.length < 2) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % slides.length;
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
      setIndex(next);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [focused, dragging, index, slides.length, width]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setDragging(false);
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setDragging(true)}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Pressable
              disabled={!item.cta}
              onPress={item.cta?.onPress}
              accessibilityRole={item.cta ? 'button' : undefined}
              accessibilityLabel={`${item.title}${item.highlight ? ` ${item.highlight}` : ''}`}
              style={({ pressed }) => [styles.cardShadow, { width: cardWidth }, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={item.gradient}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.card, { minHeight: cardHeight }]}
                onLayout={(e) => {
                  const h = Math.ceil(e.nativeEvent.layout.height);
                  setCardHeight((prev) => (h > prev ? h : prev));
                }}
              >
                <View style={styles.glow} pointerEvents="none" />
                <View style={styles.badge}>
                  <Text variant="micro" style={styles.badgeText}>
                    {item.badge}
                  </Text>
                </View>
                <Text variant="h1" color="textInverse" style={styles.title}>
                  {item.title}
                  {item.highlight ? <Text variant="h1" style={styles.highlight}>{` ${item.highlight}`}</Text> : null}
                </Text>
                <Text variant="bodySm" style={styles.body} numberOfLines={3}>
                  {item.body}
                </Text>
                {item.pill && (
                  <View style={styles.pill}>
                    <Icon name={item.pill.icon} size={14} color="#4ADE80" />
                    <Text variant="caption" weight="bold" style={styles.pillText}>
                      {item.pill.label}
                    </Text>
                  </View>
                )}
                {item.cta && (
                  <View style={styles.cta}>
                    <Icon name={item.cta.icon} size={16} color="onSecondary" />
                    <Text variant="label" weight="bold" color="onSecondary">
                      {item.cta.label}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}
      />
      {slides.length > 1 && (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {slides.map((s, i) => (
            <Dot key={s.key} active={i === index} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xs },
  cardShadow: { borderRadius: 22, ...shadows.lg },
  pressed: { opacity: 0.94 },
  card: {
    borderRadius: 22,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    right: -28,
    top: -28,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(241,140,52,0.22)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(241,140,52,0.15)',
    borderColor: 'rgba(241,140,52,0.4)',
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
  },
  badgeText: { color: '#FDBA74' },
  title: { marginTop: spacing.md },
  highlight: { color: '#FB923C' },
  body: { marginTop: spacing.sm, color: '#B7C0CC' },
  pill: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: 'rgba(34,197,94,0.45)',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
  },
  pillText: { color: '#86EFAC' },
  cta: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radii.pill,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs + 2, marginTop: spacing.md },
  dot: { height: 6, borderRadius: 3, backgroundColor: palette.slate700 },
});
