import { useNavigation } from '@react-navigation/native';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useCart } from '../../contexts/CartContext';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';
import type { RootNavigation } from '../../navigation/types';
import { colors, radii, shadows, spacing } from '../../theme';
import type { Product } from '../../types/models';
import { getDiscountPercent, getStartingPrice } from '../../utils/pricing';
import { Badge } from './Badge';
import { Button } from './Button';
import { Icon } from './Icon';
import { Image } from './Image';
import { PriceText } from './PriceText';
import { QuantityStepper } from './QuantityStepper';
import { Skeleton } from './Skeleton';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';


export interface ProductCardProps {
  product: Product;
  /** Fixed width for horizontal rails; omit in grids (fills column). */
  width?: number;
  /** Default: navigate to ProductDetail. */
  onPress?: (product: Product) => void;
  /** First-row images load with high priority. */
  priority?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Grid product tile. Port of client/src/components/products/ProductCard.js:
 * low-stock / out-of-stock states, MRP discount, "From ₹x" for variants,
 * ADD → inline stepper for simple products, "Options" for variant products,
 * bulk WhatsApp link when bulkMinQty > 0.
 * `product.price` is the server display price (already GST-adjusted per platform mode) — never re-add GST.
 */
function ProductCardBase({ product, width, onPress, priority = false, style }: ProductCardProps) {
  const navigation = useNavigation<RootNavigation>();
  const { getCartItem, updateQuantity } = useCart();
  const addToCart = useAddToCart();
  const { t } = useTranslation('common');
  const { number: bulkNumber, openBulkWhatsApp } = useBulkWhatsApp();

  const variantCount = product.variants?.length ?? 0;
  const hasVariants = variantCount > 0;
  const stock = product.totalStock ?? product.stock ?? 0;
  const outOfStock = stock <= 0;
  const cartItem = hasVariants ? undefined : getCartItem(product._id);
  const price = getStartingPrice(product);
  const discount = hasVariants ? 0 : getDiscountPercent(product.price, product.mrp);
  const open = () =>
    onPress ? onPress(product) : navigation.navigate('ProductDetail', { productId: product._id, product });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      style={({ pressed }) => [styles.card, width ? { width } : styles.flex, pressed && styles.pressed, style]}
    >
      <View style={styles.imageWrap}>
        <Image
          uri={product.images?.[0]}
          style={styles.image}
          priority={priority ? 'high' : 'normal'}
          recyclingKey={product._id}
          accessibilityLabel={product.name}
        />
        {discount > 0 && <Badge label={t('product.off', { discount })} tone="success" solid style={styles.topLeft} />}
        {!outOfStock && stock <= 10 && (
          <Badge label={t('product.onlyLeft', { count: stock })} tone="brand" solid style={discount > 0 ? styles.bottomLeft : styles.topLeft} />
        )}
        {outOfStock && (
          <View style={styles.oosOverlay}>
            <Badge label={t('product.outOfStockBadge')} tone="danger" solid size="md" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text variant="bodySm" weight="bold" numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        {hasVariants ? (
          <Text variant="caption" color="secondaryDark" weight="semibold">
            {t('product.sizes', { count: variantCount })}
          </Text>
        ) : (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {product.unit ? t('product.perUnit', { unit: product.unit }) : ' '}
          </Text>
        )}
        <PriceText
          amount={price}
          mrp={hasVariants ? undefined : product.mrp}
          prefix={hasVariants ? t('product.from') : undefined}
          unit={product.unit}
          size="md"
          hideDiscount
          style={styles.price}
        />

        {!!product.bulkMinQty && product.bulkMinQty > 0 && !!bulkNumber && (
          <Pressable onPress={() => openBulkWhatsApp(product)} hitSlop={6} style={styles.bulk} accessibilityRole="link">
            <Icon name="logo-whatsapp" size={13} color="whatsapp" />
            <Text variant="micro" color="successDark" weight="bold">
              {t('product.bulk', { qty: product.bulkMinQty, unit: product.unit ?? '' })}
            </Text>
          </Pressable>
        )}

        <View style={styles.cta}>
          {outOfStock ? (
            <Button title={t('product.outOfStock')} variant="outline" size="sm" fullWidth disabled />
          ) : hasVariants ? (
            <Button title={t('actions.options')} variant="outline" size="sm" rightIcon="chevron-forward" fullWidth onPress={open} />
          ) : cartItem ? (
            <QuantityStepper
              size="sm"
              value={cartItem.quantity}
              max={stock}
              onChange={(next) => updateQuantity(cartItem.cartKey, next)}
            />
          ) : (
            <Button title={t('actions.add')} variant="secondary" size="sm" fullWidth onPress={() => addToCart(product)} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);

/** Loading placeholder matching ProductCard dimensions. */
export function ProductCardSkeleton({ width, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, width ? { width } : styles.flex, style]}>
      <View style={styles.image}>
        <Skeleton width="100%" height="100%" radius={0} />
      </View>
      <View style={[styles.body, { gap: spacing.sm }]}>
        <Skeleton height={12} />
        <Skeleton height={12} width="70%" />
        <Skeleton height={16} width="45%" />
        <Skeleton height={34} radius={radii.sm + 2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  pressed: { opacity: 0.92 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 1 },
  topLeft: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  bottomLeft: { position: 'absolute', bottom: spacing.sm, left: spacing.sm },
  oosOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.sm + 2, gap: 2, flex: 1 },
  name: { minHeight: 36 },
  price: { marginTop: spacing.xs },
  bulk: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  cta: { marginTop: 'auto', paddingTop: spacing.sm },
});
