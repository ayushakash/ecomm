import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar } from '../../components/FocusAwareStatusBar';
import {
  CategoryTile,
  Chip,
  EmptyState,
  FloatingCartBar,
  Icon,
  LocationChip,
  ProductCard,
  Screen,
  SearchBar,
  SectionHeader,
  Skeleton,
  Text,
} from '../../components/ui';
import type { IconName } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useBanners, useCategories, usePublicSettings } from '../../hooks/queries';
import { queryKeys } from '../../hooks/queryKeys';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, layout, palette, radii, SCREEN_PADDING, spacing } from '../../theme';
import type { Banner, BannerCtaType, Product } from '../../types/models';
import { openExternal } from '../../utils/whatsapp';
import { useDetectLocation } from '../location/components/useDetectLocation';
import { FilterSheet } from '../products/components/FilterSheet';
import { GridSeparator, ProductGridSkeleton, gridStyles, useGridCellWidth } from '../products/components/ProductGridSkeleton';
import {
  EMPTY_PRICE_RANGE,
  filterQuery,
  hasPriceFilter,
  priceRangeLabel,
  type PriceRange,
  type SortOption,
} from '../products/components/productFilters';
import { useProductFeed } from '../products/components/useProductFeed';
import { HeroCarousel, type HeroSlide } from './components/HeroCarousel';
import { NoMerchantsBanner, PromoRow, SelectLocationBanner, TrustStrip } from './components/HomeSections';
import { useTranslation } from 'react-i18next';


const LOGO = require('../../../assets/logo.png');
const SORT_OPTIONS: SortOption[] = ['name', 'latest', 'price-low', 'price-high'];
const MAX_CATEGORY_TILES = 10;
const BULK_MESSAGE = 'Hi, I want to place a bulk order for construction materials.\nPlease share the pricing and availability.';
const CTA_ICONS: Record<Exclude<BannerCtaType, 'none'>, IconName> = {
  products: 'grid-outline',
  category: 'grid-outline',
  product: 'cube-outline',
  url: 'open-outline',
  whatsapp: 'logo-whatsapp',
  calculator: 'calculator-outline',
};
/** home:cta.* keys for banners without an admin-typed label. */
const DEFAULT_CTA_KEY: Record<Exclude<BannerCtaType, 'none'>, string> = {
  products: 'cta.shopNow',
  category: 'cta.shopNow',
  product: 'cta.viewProduct',
  url: 'cta.learnMore',
  whatsapp: 'cta.chatWhatsApp',
  calculator: 'cta.openCalculator',
};

/**
 * Home tab. Port of client/src/pages/Home.js + Header.js service-area strip:
 * collapsing slate header (LocationChip + logo) with a pinned search bar, hero carousel, trust strip,
 * location notices, category tiles, calculator + bulk-order CTAs, and the merchant-filtered product grid
 * with category chips, sort and price range (bottom sheet), pull-to-refresh and skeletons.
 */
export default function HomeScreen({ navigation }: MainTabScreenProps<'HomeTab'>) {
  const { t } = useTranslation('home');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    selectedAddress,
    merchantIds,
    selectedCity,
    addresses,
    isLoadingMerchants,
    activeMerchantIds,
    currentCity,
    refreshMerchants,
  } = useLocation();
  const { number: bulkNumber, callToOrder } = useBulkWhatsApp();
  const { data: settings } = usePublicSettings();
  const { data: banners } = useBanners();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { detecting, detect } = useDetectLocation();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [priceRange, setPriceRange] = useState<PriceRange>(EMPTY_PRICE_RANGE);
  const [filterOpen, setFilterOpen] = useState(false);

  // A location is set but no merchant serves it → "No merchants in X yet" instead of the grid.
  const unserviceable = !isLoadingMerchants && activeMerchantIds === undefined && !!(selectedCity || (user && selectedAddress));
  // Don't flash the unfiltered catalogue while merchants for a new location are loading.
  const waitingForMerchants = isLoadingMerchants && activeMerchantIds === undefined;

  const query = useMemo(
    () => ({ category: selectedCategory || undefined, merchantIds: activeMerchantIds, ...filterQuery(sortBy, priceRange) }),
    [selectedCategory, activeMerchantIds, sortBy, priceRange],
  );
  const feed = useProductFeed(query, sortBy, !unserviceable && !waitingForMerchants);

  const priceActive = hasPriceFilter(priceRange);
  const filtersActive = priceActive || sortBy !== 'name';
  const categoryName = selectedCategory ? categories?.find((c) => c._id === selectedCategory)?.name : undefined;
  const tileSize = Math.floor((width - SCREEN_PADDING * 2 - spacing.sm * 4) / 5);

  // ── Collapsing location row; the search bar stays pinned ────────────────────
  const scrollY = useSharedValue(0);
  const locationRowHeight = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const locationRowStyle = useAnimatedStyle(() => {
    const h = locationRowHeight.value;
    if (h === 0) return {};
    return {
      height: interpolate(scrollY.value, [0, h], [h, 0], Extrapolation.CLAMP),
      opacity: interpolate(scrollY.value, [0, h * 0.6], [1, 0], Extrapolation.CLAMP),
    };
  });

  const openBulkChat = useCallback(
    () =>
      openExternal(
        bulkNumber ? `https://wa.me/${bulkNumber}?text=${encodeURIComponent(BULK_MESSAGE)}` : null,
        t('common:external.whatsappUnavailable'),
      ),
    [bulkNumber, t],
  );

  const openProductsTab = useCallback(
    (categoryId?: string) =>
      navigation.navigate('MainTabs', { screen: 'ProductsTab', params: categoryId ? { categoryId } : undefined }),
    [navigation],
  );

  const bannerAction = useCallback(
    (b: Banner): (() => void) | undefined => {
      switch (b.ctaType) {
        case 'products':
          return () => openProductsTab();
        case 'category':
          return b.ctaValue ? () => openProductsTab(b.ctaValue) : undefined;
        case 'product':
          return b.ctaValue ? () => navigation.navigate('ProductDetail', { productId: b.ctaValue! }) : undefined;
        case 'url':
          return b.ctaValue ? () => openExternal(b.ctaValue!, t('common:external.openFailed')) : undefined;
        case 'whatsapp':
          return openBulkChat;
        case 'calculator':
          return () => navigation.navigate('Calculator');
        default:
          return undefined;
      }
    },
    [navigation, openBulkChat, openProductsTab, t],
  );

  // Admin offers (routes/banners.js) lead; the built-in brand slides follow.
  const slides = useMemo<HeroSlide[]>(
    () => [
      ...(banners ?? []).map((b): HeroSlide => {
        const onPress = b.ctaType === 'none' ? undefined : bannerAction(b);
        return {
          key: `banner-${b._id}`,
          gradient: [b.gradientFrom, b.gradientTo],
          image: b.imageUrl || undefined,
          badge: b.badge,
          title: b.title,
          highlight: b.highlight,
          body: b.body,
          cta:
            onPress && b.ctaType !== 'none'
              ? { label: b.ctaLabel || t(DEFAULT_CTA_KEY[b.ctaType]), icon: CTA_ICONS[b.ctaType], onPress }
              : undefined,
        };
      }),
      {
        key: 'hero',
        gradient: ['#2C3E54', '#1E2A3A'],
        badge: t('hero.badge'),
        title: t('hero.title'),
        highlight: currentCity ?? 'Ranchi',
        body: t('hero.body'),
        pill: { icon: 'bus-outline', label: t('hero.pill') },
      },
      {
        key: 'bulk',
        gradient: [palette.slate700, palette.slate900],
        badge: t('bulkSlide.badge'),
        title: t('bulkSlide.title'),
        highlight: t('bulkSlide.highlight'),
        body: t('bulkSlide.body'),
        cta: { label: t('cta.chatWhatsApp'), icon: 'logo-whatsapp', onPress: openBulkChat },
      },
      {
        key: 'calculator',
        gradient: ['#3B2A1A', '#1E2A3A'],
        badge: t('calcSlide.badge'),
        title: t('calcSlide.title'),
        highlight: t('calcSlide.highlight'),
        body: t('calcSlide.body'),
        cta: { label: t('cta.openCalculator'), icon: 'calculator-outline', onPress: () => navigation.navigate('Calculator') },
      },
    ],
    [banners, bannerAction, currentCity, openBulkChat, navigation, t],
  );

  const onRefresh = () =>
    feed.refresh(() =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.banners }),
        user && selectedAddress ? refreshMerchants() : null,
      ]),
    );

  const clearFilters = () => {
    setSortBy('name');
    setPriceRange(EMPTY_PRICE_RANGE);
    setSelectedCategory('');
  };

  const cellWidth = useGridCellWidth();
  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <ProductCard product={item} width={cellWidth} priority={index < 2} />
    ),
    [cellWidth],
  );

  const filterButton = (
    <Pressable
      onPress={() => setFilterOpen(true)}
      hitSlop={layout.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={t('filterA11y')}
      style={[styles.filterBtn, filtersActive && styles.filterBtnActive]}
    >
      <Icon name="options-outline" size={18} color={filtersActive ? 'onPrimary' : 'primary'} />
    </Pressable>
  );

  const listHeader = (
    <View style={styles.listHeader}>
      {!!settings?.serviceAreasNote && (
        <View style={styles.serviceStrip}>
          <Icon name="bus-outline" size={14} color="primary" />
          <Text variant="caption" color="textSecondary" style={styles.flex} numberOfLines={2}>
            {t('deliveringIn')}{' '}
            <Text variant="caption" weight="bold">
              {settings.serviceAreasNote}
            </Text>
          </Text>
        </View>
      )}

      {user && !selectedAddress && !selectedCity && (
        <SelectLocationBanner
          detecting={detecting}
          onDetect={detect}
          onAddAddress={() => navigation.navigate('AddEditAddress')}
        />
      )}
      {user && selectedAddress && merchantIds.length === 0 && !isLoadingMerchants && (
        <NoMerchantsBanner
          place={[selectedAddress.area, selectedAddress.city].filter(Boolean).join(', ')}
          canSwitch={addresses.length > 1}
          onPress={() => (addresses.length > 1 ? navigation.navigate('LocationPicker') : navigation.navigate('AddEditAddress'))}
        />
      )}

      <HeroCarousel slides={slides} />
      <TrustStrip />

      <View>
        <SectionHeader
          title={t('shopByCategory')}
          onAction={categories && categories.length > MAX_CATEGORY_TILES ? () => openProductsTab() : undefined}
        />
        <View style={styles.tileGrid}>
          {categoriesLoading && !categories
            ? Array.from({ length: 5 }, (_, i) => (
                <View key={i} style={[styles.tileSkeleton, { width: tileSize }]}>
                  <Skeleton width={tileSize} height={tileSize} radius={radii.lg} />
                  <Skeleton width={tileSize - 16} height={10} />
                </View>
              ))
            : categories
                ?.slice(0, MAX_CATEGORY_TILES)
                .map((c) => <CategoryTile key={c._id} category={c} size={tileSize} onPress={() => openProductsTab(c._id)} />)}
        </View>
      </View>

      <PromoRow onCalculator={() => navigation.navigate('Calculator')} onWhatsApp={openBulkChat} onCall={callToOrder} />

      <View style={styles.productsHead}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="h1" numberOfLines={1}>
              {categoryName ?? t('allMaterials')}
            </Text>
            <Text variant="caption" color="textSecondary">
              {unserviceable
                ? t('noStores')
                : feed.isLoading || waitingForMerchants
                  ? t('loadingProducts')
                  : t('productsFound', { count: feed.totalProducts })}
            </Text>
          </View>
          {isLoadingMerchants && <ActivityIndicator size="small" color={colors.textMuted} />}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label={filtersActive ? (priceActive ? priceRangeLabel(priceRange) : t('sorted')) : t('sortFilter')}
            icon="options-outline"
            dropdown
            selected={filtersActive}
            onPress={() => setFilterOpen(true)}
          />
          <Chip label={t('allProducts')} selected={selectedCategory === ''} onPress={() => setSelectedCategory('')} />
          {categories?.map((c) => (
            <Chip
              key={c._id}
              label={c.name}
              selected={selectedCategory === c._id}
              onPress={() => setSelectedCategory(c._id)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const listEmpty = unserviceable ? (
    <EmptyState
      icon="storefront-outline"
      title={t('empty.noMerchantsTitle', { place: selectedAddress?.city || selectedCity?.city || t('empty.yourArea') })}
      message={t('empty.noMerchantsMessage')}
      actionLabel={user ? t('empty.tryAddress') : t('empty.selectCity')}
      onAction={() => navigation.navigate('LocationPicker')}
      fill={false}
    />
  ) : feed.isLoading || waitingForMerchants ? (
    <ProductGridSkeleton rows={2} />
  ) : feed.isError ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={t('empty.loadFailedTitle')}
      message={t('empty.loadFailedMessage')}
      actionLabel={t('common:actions.retry')}
      onAction={() => feed.retry()}
      fill={false}
    />
  ) : (
    <EmptyState
      icon="search-outline"
      title={t('empty.noProducts')}
      message={selectedCategory ? t('empty.noProductsCategory') : t('empty.adjustFilters')}
      actionLabel={filtersActive || selectedCategory ? t('empty.clearFilters') : undefined}
      onAction={clearFilters}
      fill={false}
    />
  );

  return (
    <Screen>
      <FocusAwareStatusBar style="light" />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Animated.View style={[styles.locationClip, locationRowStyle]}>
          <View
            style={styles.locationRow}
            onLayout={(e) => {
              locationRowHeight.value = e.nativeEvent.layout.height;
            }}
          >
            <LocationChip tone="onDark" style={styles.flex} />
            <ExpoImage source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel="Chardeevari" />
          </View>
        </Animated.View>
        <SearchBar onPress={() => navigation.navigate('Search')} right={filterButton} />
      </View>

      <Animated.FlatList
        data={unserviceable || feed.isLoading || waitingForMerchants ? [] : feed.products}
        keyExtractor={(item: Product) => item._id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={gridStyles.columns}
        ItemSeparatorComponent={GridSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          feed.isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} color={colors.primary} /> : null
        }
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={9}
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sortOptions={SORT_OPTIONS}
        sortBy={sortBy}
        priceRange={priceRange}
        onApply={(sort, range) => {
          setSortBy(sort);
          setPriceRange(range);
        }}
      />
      <FloatingCartBar />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    backgroundColor: '#1E2A3A',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    zIndex: 2,
  },
  locationClip: { overflow: 'hidden' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  logo: { width: 58, height: 32 },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: colors.primary },
  listHeader: { paddingTop: spacing.lg, gap: spacing.xl, paddingBottom: spacing.md },
  serviceStrip: {
    marginHorizontal: SCREEN_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.md, paddingHorizontal: SCREEN_PADDING },
  tileSkeleton: { alignItems: 'center', gap: spacing.xs + 2 },
  productsHead: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: SCREEN_PADDING },
  chips: { paddingHorizontal: SCREEN_PADDING, gap: spacing.sm },
  listContent: { paddingBottom: layout.floatingCartBarSpace + spacing.lg },
  footerSpinner: { paddingVertical: spacing.xl },
});
