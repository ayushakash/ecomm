import * as Haptics from 'expo-haptics';
import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Icon, Image, QuantityStepper, Text } from '../../../components/ui';
import { colors, layout, radii, spacing } from '../../../theme';
import type { CartItem } from '../../../types/models';
import { formatPrice } from '../../../utils/pricing';

const ACTION_WIDTH = 88;

function DeleteAction({ drag }: { drag: SharedValue<number> }) {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(-drag.value, [0, ACTION_WIDTH], [0.6, 1], 'clamp') }],
  }));
  const { t } = useTranslation('cart');
  return (
    <View style={styles.deleteAction}>
      <Animated.View style={[styles.deleteInner, iconStyle]}>
        <Icon name="trash-outline" size={22} color="textInverse" />
        <Text variant="micro" color="textInverse" weight="bold">{t('lineItem.remove')}</Text>
      </Animated.View>
    </View>
  );
}

export interface CartLineItemProps {
  item: CartItem;
  onQuantityChange(cartKey: string, quantity: number): void;
  onRemove(cartKey: string): void;
  onOpen(item: CartItem): void;
}

/** One cart row (web Cart.js line item): image, name, variant chip, unit price, stepper, line total; swipe left to remove. */
export const CartLineItem = memo(function CartLineItem({ item, onQuantityChange, onRemove, onOpen }: CartLineItemProps) {
  const { t } = useTranslation('cart');
  const remove = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove(item.cartKey);
  }, [item.cartKey, onRemove]);

  const changeQty = useCallback(
    (next: number) => {
      if (next <= 0) {
        remove();
        return;
      }
      void Haptics.selectionAsync();
      onQuantityChange(item.cartKey, next);
    },
    [item.cartKey, onQuantityChange, remove],
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      onSwipeableOpen={remove}
    >
      <View style={styles.row}>
        <Pressable
          onPress={() => onOpen(item)}
          accessibilityRole="button"
          accessibilityLabel={t('lineItem.openA11y', { name: item.name })}
          style={styles.imageWrap}
        >
          <Image uri={item.images?.[0]} style={styles.image} recyclingKey={item.cartKey} fallbackIcon="cube-outline" />
        </Pressable>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <Text variant="title" numberOfLines={2}>
                {item.name}
              </Text>
              {!!item.variantLabel && (
                <View style={styles.variant}>
                  <Text variant="micro" color="primary" weight="semibold">
                    {item.variantLabel}
                  </Text>
                </View>
              )}
              <Text variant="caption" color="textSecondary" style={styles.unitPrice}>
                {formatPrice(item.price)} / {item.unit}
              </Text>
            </View>
            <Pressable
              onPress={remove}
              hitSlop={layout.hitSlop}
              accessibilityRole="button"
              accessibilityLabel={t('lineItem.removeA11y', { name: item.name })}
              style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
            >
              <Icon name="trash-outline" size={18} color="danger" />
            </Pressable>
          </View>

          <View style={styles.footer}>
            <QuantityStepper value={item.quantity} onChange={changeQty} size="sm" tone="outline" />
            <Text variant="price" color="primary">
              {formatPrice(item.price * item.quantity)}
            </Text>
          </View>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  imageWrap: { borderRadius: radii.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  image: { width: 72, height: 72 },
  body: { flex: 1, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  variant: {
    alignSelf: 'flex-start',
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  unitPrice: { marginTop: spacing.xxs },
  trash: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  trashPressed: { backgroundColor: colors.dangerSoft },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deleteAction: { width: ACTION_WIDTH, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteInner: { alignItems: 'center', gap: 2 },
});
