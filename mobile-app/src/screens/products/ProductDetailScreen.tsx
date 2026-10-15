import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  PriceText,
  Screen,
  ScreenHeader,
  Skeleton,
  SkeletonLines,
  Text,
  type BadgeTone,
} from '../../components/ui';
import { WEBSITE_URL } from '../../config';
import { useCart } from '../../contexts/CartContext';
import { useLocation } from '../../contexts/LocationContext';
import { useProduct } from '../../hooks/queries';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';
import type { RootStackScreenProps } from '../../navigation/types';
import { getErrorMessage } from '../../services/api';
import { colors, fonts, radii, SCREEN_PADDING, shadows, spacing } from '../../theme';
import type { Product, ProductVariant } from '../../types/models';
import { formatPrice } from '../../utils/pricing';
import { toast } from '../../utils/toast';
import { openExternal } from '../../utils/whatsapp';
import { ProductImageGallery, type ProductImageGalleryHandle } from './components/ProductImageGallery';
import { ProductImageViewer } from './components/ProductImageViewer';
import { VariantSelector } from './components/VariantSelector';

const DESCRIPTION_CLAMP = 220;
const LOW_STOCK = 10;

/** Port of client/src/pages/products/ProductDetail.js. */
export default function ProductDetailScreen({ navigation, route }: RootStackScreenProps<'ProductDetail'>) {
  const { t } = useTranslation('products');
  const { productId, product: snapshot } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch, isRefetching } = useProduct(productId);
  // A failed fetch (404 "Product not available" for the user's merchants) wins over the list snapshot.
  const product = data ?? (error ? undefined : snapshot);

  const { getCartItem, cartCount } = useCart();
  const { currentCity } = useLocation();
  const addToCart = useAddToCart();
  const { number: waNumber, getWhatsAppLink, callToOrder } = useBulkWhatsApp();

  const [quantity, setQuantity] = useState(1);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const galleryRef = useRef<ProductImageGalleryHandle>(null);

  const variants = product?.variants ?? [];
  const hasVariants = variants.length > 0;
  // Re-derived from the latest fetch so variant price/stock never go stale.
  const selectedVariant = (hasVariants && variants.find((v) => v.label === selectedLabel)) || null;
  const needsSize = hasVariants && !selectedVariant;
  const activePrice = selectedVariant ? selectedVariant.price : product?.price;
  const activeStock = selectedVariant ? selectedVariant.stock : product?.totalStock || product?.stock || 0;
  const productSoldOut = hasVariants ? variants.every((v) => v.stock <= 0) : activeStock <= 0;
  const cartItem = product ? getCartItem(product._id, hasVariants ? selectedVariant?.label : undefined) : undefined;

  // Stock can drop on refetch or variant change: keep quantity within 1..stock.
  useEffect(() => {
    if (activeStock > 0 && quantity > activeStock) setQuantity(activeStock);
  }, [activeStock, quantity]);

  const openViewer = useCallback((index: number) => setViewerIndex(index), []);

  const selectVariant = (variant: ProductVariant) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedLabel(variant.label);
    setQuantity(1);
  };

  const handleAdd = async (buyNow: boolean) => {
    if (!product) return;
    if (needsSize) {
      toast.error(t('detail.toast.selectSize'));
      return;
    }
    if (activeStock <= 0) {
      toast.error(t('detail.toast.outOfStock'));
      return;
    }
    const added = await addToCart(product, quantity, selectedVariant);
    if (!added) return;
    if (buyNow) navigation.navigate('MainTabs', { screen: 'CartTab' });
    else toast.success(t('detail.toast.added', { count: quantity }));
  };

  const shareProduct = async () => {
    if (!product) return;
    const url = `${WEBSITE_URL}/products/${product._id}`;
    try {
      await Share.share({ message: `${t('detail.shareMessage', { name: product.name })}\n${url}`, url, title: product.name });
    } catch {
      toast.error(t('detail.toast.shareFailed'));
    }
  };

  const orderOnWhatsApp = () => {
    if (!product) return;
    const priceLabel = activePrice !== undefined && !needsSize ? `₹${activePrice.toLocaleString('en-IN')}` : '';
    const message = `Hi, I want to order:\n${product.name}${selectedVariant ? ` (${selectedVariant.label})` : ''} — ${priceLabel}${
      product.unit ? `/${product.unit}` : ''
    }\nQty: ${quantity}`;
    openExternal(
      waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null,
      t('detail.whatsappUnavailable'),
    );
  };

  const specRows = useMemo(() => buildSpecRows(product?.specifications), [product?.specifications]);

  const headerActions = [
    { icon: 'share-social-outline' as const, onPress: shareProduct, accessibilityLabel: t('detail.shareA11y') },
    {
      icon: 'cart-outline' as const,
      onPress: () => navigation.navigate('MainTabs', { screen: 'CartTab' }),
      accessibilityLabel: t('detail.openCartA11y'),
      badge: cartCount,
    },
  ];

  if (!product) {
    return (
      <Screen background={colors.surface}>
        <ScreenHeader compact title={t('detail.headerTitle')} actions={isLoading ? undefined : headerActions.slice(1)} />
        {isLoading ? (
          <DetailSkeleton width={width} />
        ) : (
          <EmptyState
            icon="cube-outline"
            title={t('detail.notAvailable.title')}
            message={error ? getErrorMessage(error, t('detail.notAvailable.loadError')) : t('detail.notAvailable.notFound')}
            actionLabel={t('detail.notAvailable.browse')}
            onAction={() => navigation.navigate('MainTabs', { screen: 'ProductsTab' })}
            secondaryLabel={t('detail.notAvailable.retry')}
            onSecondary={() => refetch()}
          />
        )}
      </Screen>
    );
  }

  const categoryName = typeof product.category === 'object' && product.category ? product.category.name : undefined;
  const categoryId = typeof product.category === 'object' && product.category ? product.category._id : undefined;
  const minVariantPrice = hasVariants ? Math.min(...variants.map((v) => v.price)) : 0;
  const showQuantity = activeStock > 0 && !needsSize;
  const bulkMinQty = product.bulkMinQty ?? 0;
  const description = product.description?.trim() ?? '';
  const clampDescription = description.length > DESCRIPTION_CLAMP;
  const images = product.images ?? [];

  let stockBadge: { label: string; tone: BadgeTone; icon: 'checkmark-circle' | 'alert-circle' | 'close-circle' | 'resize' };
  if (productSoldOut) stockBadge = { label: t('stock.outOfStock'), tone: 'danger', icon: 'close-circle' };
  else if (needsSize) stockBadge = { label: t('stock.sizesAvailable', { count: variants.length }), tone: 'info', icon: 'resize' };
  else if (activeStock <= 0) stockBadge = { label: t('stock.outOfStock'), tone: 'danger', icon: 'close-circle' };
  else if (activeStock <= LOW_STOCK) stockBadge = { label: t('stock.onlyLeft', { count: activeStock }), tone: 'brand', icon: 'alert-circle' };
  else stockBadge = { label: t('stock.inStock'), tone: 'success', icon: 'checkmark-circle' };

  return (
    <Screen>
      <ScreenHeader compact title={product.name} subtitle={categoryName} actions={headerActions} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: barHeight + spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <ProductImageGallery
          ref={galleryRef}
          images={images}
          name={product.name}
          width={width}
          outOfStock={productSoldOut}
          onOpen={openViewer}
        />

        {/* Name, price, stock, trust */}
        <View style={[styles.section, styles.firstSection]}>
          {categoryName && (
            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab', params: { categoryId } })}
              accessibilityRole="link"
              accessibilityLabel={t('search.browseA11y', { name: categoryName })}
              hitSlop={6}
              style={styles.categoryTag}
            >
              <Text variant="micro" weight="bold" color="primary" style={styles.upper}>
                {categoryName}
              </Text>
              <Icon name="chevron-forward" size={12} color="primary" />
            </Pressable>
          )}
          <Text variant="h1" style={styles.name}>
            {product.name}
          </Text>

          {needsSize ? (
            <PriceText amount={minVariantPrice} prefix={t('detail.from')} unit={product.unit} size="xl" hideDiscount />
          ) : (
            <PriceText amount={activePrice ?? 0} mrp={product.mrp} unit={product.unit} size="xl" />
          )}
          <Text variant="caption" color="textMuted" style={styles.taxNote}>
            {t('detail.taxNote')}
          </Text>

          <View style={styles.badgeRow}>
            <Badge label={stockBadge.label} tone={stockBadge.tone} icon={stockBadge.icon} size="md" />
            {!!product.sku && !hasVariants && <Badge label={`SKU ${product.sku}`} tone="neutral" size="md" />}
          </View>

          <View style={styles.trustRow}>
            <Badge icon="flash" label={t('detail.trust.delivery', { city: currentCity || 'Ranchi' })} tone="success" size="md" />
            <Badge icon="cash-outline" label={t('detail.trust.payOnDelivery')} tone="info" size="md" />
            <Badge icon="shield-checkmark" label={t('detail.trust.genuine')} tone="secondary" size="md" />
          </View>
        </View>

        {/* Variants + quantity */}
        {(hasVariants || showQuantity) && (
          <View style={styles.section}>
            {hasVariants && (
              <VariantSelector variants={variants} selectedLabel={selectedLabel} unit={product.unit} onSelect={selectVariant} />
            )}
            {showQuantity && (
              <View style={[styles.qtyRow, hasVariants && styles.qtyRowSpaced]}>
                <View style={styles.flex}>
                  <Text variant="title" weight="bold">
                    {t('detail.quantity')}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {t('detail.qtyTotal', { price: formatPrice((activePrice ?? 0) * quantity), quantity, unit: product.unit ?? '' })}
                  </Text>
                </View>
                <DetailStepper value={quantity} max={activeStock} onChange={setQuantity} />
              </View>
            )}
            {needsSize && (
              <View style={styles.hint}>
                <Icon name="arrow-up" size={14} color="secondaryDark" />
                <Text variant="caption" weight="semibold" color="secondaryDark">
                  {t('detail.selectSizeHint')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* In-cart shortcut */}
        {cartItem && (
          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'CartTab' })}
            style={({ pressed }) => [styles.inCart, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel={t('detail.inCart.a11y', { count: cartItem.quantity })}
          >
            <Icon name="cart" size={18} color="successDark" />
            <Text variant="bodySm" weight="semibold" color="successDark" style={styles.flex}>
              {t('detail.inCart.units', { count: cartItem.quantity })}
            </Text>
            <Text variant="bodySm" weight="bold" color="successDark">
              {t('detail.inCart.view')}
            </Text>
            <Icon name="chevron-forward" size={16} color="successDark" />
          </Pressable>
        )}

        {/* Order by chat / phone (web: always when a number is configured) */}
        {!!waNumber && (
          <View style={styles.section}>
            {bulkMinQty > 0 && (
              <Pressable
                onPress={() =>
                  openExternal(
                    getWhatsAppLink(
                      {
                        name: selectedVariant ? `${product.name} (${selectedVariant.label})` : product.name,
                        sku: selectedVariant?.sku || product.sku,
                        unit: product.unit,
                      },
                      Math.max(quantity, bulkMinQty),
                    ),
                    t('detail.whatsappUnavailable'),
                  )
                }
                style={({ pressed }) => [styles.bulk, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel={t('detail.bulk.a11y', { qty: bulkMinQty, unit: product.unit ?? '' })}
              >
                <View style={styles.bulkIcon}>
                  <Icon name="cube" size={20} color="secondaryDark" />
                </View>
                <View style={styles.flex}>
                  <Text variant="label" weight="bold">
                    {t('detail.bulk.title', { qty: bulkMinQty, unit: product.unit ?? '' })}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {t('detail.bulk.subtitle')}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color="textMuted" />
              </Pressable>
            )}
            <View style={styles.contactRow}>
              <Button title={t('detail.orderWhatsApp')} variant="whatsapp" size="sm" leftIcon="logo-whatsapp" onPress={orderOnWhatsApp} style={styles.flex} />
              <Button title={t('detail.callToOrder')} variant="outline" size="sm" leftIcon="call" onPress={callToOrder} style={styles.flex} />
            </View>
          </View>
        )}

        {/* Description */}
        {!!description && (
          <View style={styles.section}>
            <Text variant="caption" weight="bold" color="textSecondary" style={[styles.upper, styles.sectionTitle]}>
              {t('detail.description')}
            </Text>
            <Text variant="body" color="textSecondary" numberOfLines={clampDescription && !descExpanded ? 4 : undefined} style={styles.description}>
              {description}
            </Text>
            {clampDescription && (
              <Pressable onPress={() => setDescExpanded((v) => !v)} hitSlop={8} accessibilityRole="button" style={styles.readMore}>
                <Text variant="label" weight="bold" color="primary">
                  {descExpanded ? t('detail.showLess') : t('detail.readMore')}
                </Text>
                <Icon name={descExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="primary" />
              </Pressable>
            )}
          </View>
        )}

        {/* Specifications */}
        {specRows.length > 0 && (
          <View style={styles.section}>
            <Text variant="caption" weight="bold" color="textSecondary" style={[styles.upper, styles.sectionTitle]}>
              {t('detail.specifications')}
            </Text>
            <View style={styles.specTable}>
              {specRows.map((row, i) => (
                <View key={row.label} style={[styles.specRow, i % 2 === 0 && styles.specRowAlt]}>
                  <Text variant="bodySm" color="textSecondary" style={styles.specLabel}>
                    {row.label}
                  </Text>
                  <Text variant="bodySm" weight="semibold" style={styles.flex}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View
        style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
      >
        {!needsSize && activeStock <= 0 ? (
          <Button title={t('stock.outOfStock')} variant="outline" disabled fullWidth leftIcon="close-circle-outline" />
        ) : (
          <View style={styles.barRow}>
            <Button
              title={cartItem ? t('detail.addMore') : t('detail.addToCart')}
              variant="outline"
              leftIcon="cart-outline"
              onPress={() => handleAdd(false)}
              disabled={needsSize}
              style={styles.flex}
            />
            <Button
              title={t('detail.buyNow')}
              variant="secondary"
              rightIcon="arrow-forward"
              onPress={() => handleAdd(true)}
              disabled={needsSize}
              style={styles.flex}
            />
          </View>
        )}
      </View>

      <ProductImageViewer
        visible={viewerIndex !== null}
        images={images}
        name={product.name}
        initialIndex={viewerIndex ?? 0}
        onClose={(last) => {
          setViewerIndex(null);
          galleryRef.current?.scrollTo(last);
        }}
      />
    </Screen>
  );
}

/** Web renders every truthy specification; the nested `dimensions` object becomes "L × W × H unit". */
function buildSpecRows(specs: Product['specifications']): { label: string; value: string }[] {
  if (!specs) return [];
  return Object.entries(specs).flatMap(([key, value]) => {
    if (value === null || value === undefined || value === '' || value === 0 || key === '_id') return [];
    const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
    if (typeof value === 'object') {
      const d = value as { length?: number; width?: number; height?: number; unit?: string };
      const parts = [d.length, d.width, d.height].filter((n): n is number => typeof n === 'number' && n > 0);
      return parts.length ? [{ label, value: `${parts.join(' × ')}${d.unit ? ` ${d.unit}` : ''}` }] : [];
    }
    return [{ label, value: String(value) }];
  });
}

/** Detail-page quantity: minimum 1 (web), maximum stock, typed values clamp. */
function DetailStepper({ value, max, onChange }: { value: number; max: number; onChange(next: number): void }) {
  const { t } = useTranslation('products');
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const step = (next: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };
  const commit = () => {
    const n = parseInt(draft, 10);
    const next = !n || n < 1 ? 1 : Math.min(n, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => step(value - 1)}
        disabled={value <= 1}
        style={[styles.stepBtn, value <= 1 && styles.stepDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('detail.decreaseQty')}
      >
        <Icon name="remove" size={20} />
      </Pressable>
      <TextInput
        value={draft}
        onChangeText={(v) => setDraft(v.replace(/[^0-9]/g, ''))}
        onEndEditing={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={5}
        accessibilityLabel={t('detail.quantity')}
        style={styles.stepInput}
      />
      <Pressable
        onPress={() => step(value + 1)}
        disabled={value >= max}
        style={[styles.stepBtn, value >= max && styles.stepDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('detail.increaseQty')}
      >
        <Icon name="add" size={20} />
      </Pressable>
    </View>
  );
}

function DetailSkeleton({ width }: { width: number }) {
  return (
    <View>
      <Skeleton width={width} height={width} radius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton width={90} height={14} />
        <Skeleton width="80%" height={24} />
        <Skeleton width={140} height={28} />
        <View style={styles.trustRow}>
          <Skeleton width={110} height={26} radius={radii.pill} />
          <Skeleton width={110} height={26} radius={radii.pill} />
        </View>
        <SkeletonLines lines={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.lg,
  },
  firstSection: { marginTop: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  categoryTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  name: { marginBottom: spacing.sm },
  taxNote: { marginTop: spacing.xs },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyRowSpaced: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  inCart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginHorizontal: SCREEN_PADDING,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
  },
  bulk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.secondarySoft,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
  },
  bulkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { marginBottom: spacing.sm },
  description: { lineHeight: 21 },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.sm, alignSelf: 'flex-start' },
  specTable: { borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  specRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  specRowAlt: { backgroundColor: colors.surfaceMuted },
  specLabel: { width: '38%' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  stepBtn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  stepInput: {
    width: 64,
    height: '100%',
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.float,
  },
  barRow: { flexDirection: 'row', gap: spacing.md },
  skeletonBody: { padding: SCREEN_PADDING, gap: spacing.md },
});
