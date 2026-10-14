import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useContext } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../contexts/CartContext';
import type { RootNavigation } from '../../navigation/types';
import { colors, radii, shadows, spacing } from '../../theme';
import { formatPrice } from '../../utils/pricing';
import { Icon } from './Icon';
import { Image } from './Image';
import { Text } from './Text';

export interface FloatingCartBarProps {
  /** Default: switch to the Cart tab. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sticky "N items · ₹total — View cart ›" pill shown over browse screens when
 * the cart is non-empty. Render as the LAST child of a screen root with
 * `flex: 1`; it positions itself absolutely above the tab bar / home indicator.
 * Lists should add `layout.floatingCartBarSpace` bottom padding.
 */
export function FloatingCartBar({ onPress, style }: FloatingCartBarProps) {
  const navigation = useNavigation<RootNavigation>();
  const { cart, cartCount, cartTotal, isHydrated } = useCart();
  const insets = useSafeAreaInsets();
  const inTabs = useContext(BottomTabBarHeightContext) !== undefined;
  if (!isHydrated || cartCount === 0) return null;
  const bottom = (inTabs ? 0 : insets.bottom) + spacing.md;
  const thumbs = cart.slice(0, 3);

  return (
    <Animated.View
      entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutDown.duration(180)}
      style={[styles.wrap, { bottom }, style]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress ?? (() => navigation.navigate('MainTabs', { screen: 'CartTab' }))}
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${cartCount} items, ${formatPrice(cartTotal)}`}
        style={({ pressed }) => [styles.bar, pressed && { backgroundColor: colors.primaryDark }]}
      >
        <View style={styles.thumbs}>
          {thumbs.map((item, i) => (
            <View key={item.cartKey} style={[styles.thumb, { marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i }]}>
              <Image uri={item.images[0]} style={styles.thumbImg} />
            </View>
          ))}
        </View>
        <View style={styles.flex}>
          <Text variant="label" weight="bold" style={{ color: colors.textInverse }}>
            {cartCount} item{cartCount > 1 ? 's' : ''}
          </Text>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {formatPrice(cartTotal)} · Pay on delivery
          </Text>
        </View>
        <View style={styles.cta}>
          <Text variant="label" weight="extrabold" style={{ color: colors.onSecondary }}>
            View cart
          </Text>
          <Icon name="chevron-forward" size={16} color="onSecondary" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md },
  bar: {
    height: 62,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.md,
    ...shadows.lg,
  },
  flex: { flex: 1 },
  thumbs: { flexDirection: 'row' },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbImg: { width: '100%', height: '100%' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radii.md,
  },
});
