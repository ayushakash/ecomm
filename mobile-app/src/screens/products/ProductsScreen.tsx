import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Button,
  Chip,
  EmptyState,
  FloatingCartBar,
  Icon,
  ProductCard,
  Screen,
  ScreenHeader,
  Text,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useCategories } from '../../hooks/queries';
import { queryKeys } from '../../hooks/queryKeys';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, layout, radii, SCREEN_PADDING, spacing } from '../../theme';
import type { Product } from '../../types/models';
import { CityPicker } from '../location/components/CityPicker';
import { useDetectLocation } from '../location/components/useDetectLocation';
import { CategoryRail } from './components/CategoryRail';
import { FilterSheet } from './components/FilterSheet';
import { GridSeparator, ProductGridSkeleton, gridStyles, useGridCellWidth } from './components/ProductGridSkeleton';
import {
  EMPTY_PRICE_RANGE,
  filterQuery,
  hasPriceFilter,
  priceRangeLabel,
  SORT_LABELS,
  type PriceRange,
  type SortOption,
} from './components/productFilters';
import { useProductFeed } from './components/useProductFeed';

const SORT_OPTIONS: SortOption[] = ['latest', 'price-low', 'price-high'];

/** Full-screen centred message used by the location gates. */
function Gate({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.gate} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/**
 * Categories tab. Port of client/src/pages/products/ProductList.js:
 * location gates (loading / guest city picker / no address / no merchants),
 * address nudge + location info banner, category / price / sort filters
 * (price-high sorted client-side like web) and an infinite 2-column grid.
 */
export default function ProductsScreen({ navigation, route }: MainTabScreenProps<'ProductsTab'>) {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const {
    selectedAddress,
    merchantIds,
    selectedCity,
    cityMerchantIds,
    isLoadingMerchants,
    locationInfo,
    refreshMerchants,
  } = useLocation();
  const { detecting, detect } = useDetectLocation();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [priceRange, setPriceRange] = useState<PriceRange>(EMPTY_PRICE_RANGE);
  const [filterOpen, setFilterOpen] = useState(false);

  // Home category tiles deep-link here with { categoryId }; consume once so the same tile works again.
  const paramCategory = route.params?.categoryId;
  useEffect(() => {
    if (paramCategory === undefined) return;
    setSelectedCategory(paramCategory);
    navigation.setParams({ categoryId: undefined });
  }, [paramCategory, navigation]);

  // Address-based merchants win; city-based is the fallback (web effectiveMerchantIds).
  const effectiveMerchantIds = merchantIds.length > 0 ? merchantIds : cityMerchantIds;
  const query = useMemo(
    () => ({
      category: selectedCategory || undefined,
      merchantIds: effectiveMerchantIds.length > 0 ? effectiveMerchantIds : undefined,
      ...filterQuery(sortBy, priceRange),
    }),
    [selectedCategory, effectiveMerchantIds, sortBy, priceRange],
  );
  const feed = useProductFeed(query, sortBy, effectiveMerchantIds.length > 0);

  const categoryName = selectedCategory ? categories?.find((c) => c._id === selectedCategory)?.name : undefined;
  const priceActive = hasPriceFilter(priceRange);
  const filtersActive = priceActive || sortBy !== 'latest';

  const clearFilters = () => {
    setSortBy('latest');
    setPriceRange(EMPTY_PRICE_RANGE);
  };

  const onRefresh = () =>
    feed.refresh(() =>
      Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.categories }), user ? refreshMerchants() : null]),
    );

  const openLocation = () => navigation.navigate('LocationPicker');

  const cellWidth = useGridCellWidth();
  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <ProductCard product={item} width={cellWidth} priority={index < 2} />
    ),
    [cellWidth],
  );

  const header = (
    <ScreenHeader
      title="Categories"
      subtitle="Cement, steel, sand & more"
      back={false}
      icon="grid-outline"
      actions={[
        {
          icon: 'search',
          accessibilityLabel: 'Search products',
          onPress: () => navigation.navigate('Search', { categoryId: selectedCategory || undefined }),
        },
      ]}
    />
  );

  // ── Location gates (same order as web) ─────────────────────────────────────
  if (authLoading || (isLoadingMerchants && effectiveMerchantIds.length === 0)) {
    return (
      <Screen>
        {header}
        <View style={styles.finding}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="bodySm" color="textSecondary">
            Finding merchants near you...
          </Text>
        </View>
        <ProductGridSkeleton />
      </Screen>
    );
  }

  // Fallback only: guests normally get a default city from LocationContext.
  if (!user && !selectedCity) {
    return (
      <Screen>
        {header}
        <Gate>
          <View style={styles.gateIcon}>
            <Icon name="location" size={36} color="primary" />
          </View>
          <Text variant="h1" align="center">
            Where should we deliver?
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.gateText}>
            Select your city to see products and merchants available in your area.
          </Text>
          <Button title="Use my current location" leftIcon="locate" loading={detecting} onPress={detect} fullWidth />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text variant="caption" color="textMuted">
              or pick a city
            </Text>
            <View style={styles.orLine} />
          </View>
          <View style={styles.fullWidth}>
            <CityPicker />
          </View>
          <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link" style={styles.loginLink}>
            <Text variant="bodySm" color="textSecondary" align="center">
              <Text variant="bodySm" color="primary" weight="bold">
                Login
              </Text>{' '}
              for a fully personalised experience
            </Text>
          </Pressable>
        </Gate>
      </Screen>
    );
  }

  // Logged in, no address, no GPS/city merchants.
  if (user && !selectedAddress && cityMerchantIds.length === 0) {
    return (
      <Screen>
        {header}
        <Gate>
          <View style={styles.gateIcon}>
            <Icon name="location" size={36} color="primary" />
          </View>
          <Text variant="h1" align="center">
            Set your delivery location
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.gateText}>
            Add an address for precise delivery, or use your current location to browse products near you.
          </Text>
          <Button title="Add delivery address" leftIcon="add" onPress={() => navigation.navigate('AddEditAddress')} fullWidth />
          <Button
            title={detecting ? 'Detecting location...' : 'Use current location to browse'}
            variant="outline"
            leftIcon="locate"
            loading={detecting}
            onPress={detect}
            fullWidth
          />
        </Gate>
      </Screen>
    );
  }

  // Address chosen but nobody serves it.
  if (user && selectedAddress && merchantIds.length === 0) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon="storefront-outline"
          title="No merchants in your area yet"
          message={`We don't have merchants serving ${[selectedAddress.area, selectedAddress.city].filter(Boolean).join(', ')} yet. We're expanding to new areas soon — try a different address.`}
          actionLabel="Change address"
          onAction={openLocation}
        />
      </Screen>
    );
  }

  // Guest city with no merchants.
  if (!user && selectedCity && cityMerchantIds.length === 0) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon="storefront-outline"
          title={`No merchants in ${selectedCity.city} yet`}
          message="We're expanding to new areas soon. Try a different location or check back later."
          actionLabel="Change location"
          onAction={openLocation}
        />
      </Screen>
    );
  }

  // ── Product browser ────────────────────────────────────────────────────────
  const listHeader = (
    <View style={styles.listHeader}>
      {user && !selectedAddress && selectedCity && (
        <Pressable
          onPress={() => navigation.navigate('AddEditAddress')}
          accessibilityRole="button"
          accessibilityLabel="Add address"
          style={[styles.banner, styles.nudge]}
        >
          <Icon name="information-circle" size={18} color="secondaryDark" />
          <Text variant="bodySm" style={styles.bannerText}>
            Browsing in{' '}
            <Text variant="bodySm" weight="bold">
              {selectedCity.city}
            </Text>
            . Add an address for accurate delivery options.
          </Text>
          <Text variant="label" color="secondaryDark" weight="bold">
            Add
          </Text>
        </Pressable>
      )}
      {locationInfo && (
        <Pressable
          onPress={openLocation}
          accessibilityRole="button"
          accessibilityLabel="Change delivery location"
          style={[styles.banner, styles.info]}
        >
          <Icon name="location" size={18} color="successDark" />
          <View style={styles.bannerText}>
            <Text variant="label" color="successDark" numberOfLines={1}>
              {user && selectedAddress
                ? `Delivering to ${[selectedAddress.area, selectedAddress.city].filter(Boolean).join(', ')}`
                : `Showing products in ${selectedCity?.city ?? ''}`}
            </Text>
            <Text variant="caption" color="successDark">
              {user && selectedAddress
                ? `${locationInfo.merchantCount} ${locationInfo.merchantCount === 1 ? 'merchant' : 'merchants'} · ${typeof locationInfo.searchRadius === 'number' ? `within ${locationInfo.searchRadius}km` : locationInfo.searchRadius}${locationInfo.fallbackApplied ? ' (expanded search)' : ''}`
                : `${locationInfo.merchantCount} ${locationInfo.merchantCount === 1 ? 'merchant' : 'merchants'} available${user ? '' : ' · Login for precise delivery'}`}
            </Text>
          </View>
          <Text variant="label" color="successDark" weight="bold">
            {user ? 'Change' : 'Change city'}
          </Text>
        </Pressable>
      )}
      <View style={styles.resultsRow}>
        <Text variant="h2" numberOfLines={1} style={styles.flex}>
          {categoryName ?? 'Construction Materials'}
        </Text>
        {!feed.isLoading && (
          <Text variant="caption" color="textSecondary">
            {feed.totalProducts} {feed.totalProducts === 1 ? 'product' : 'products'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <Screen>
      {header}
      <View style={styles.toolbar}>
        <CategoryRail
          categories={categories}
          loading={categoriesLoading}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={SORT_LABELS[sortBy]} icon="swap-vertical" dropdown onPress={() => setFilterOpen(true)} />
          <Chip
            label={priceRangeLabel(priceRange)}
            icon="pricetag-outline"
            dropdown
            selected={priceActive}
            onPress={() => setFilterOpen(true)}
          />
          {filtersActive && <Chip label="Clear" icon="close" onPress={clearFilters} />}
        </ScrollView>
      </View>

      {feed.isLoading ? (
        <ScrollView contentContainerStyle={styles.skeletonWrap}>
          {listHeader}
          <ProductGridSkeleton />
        </ScrollView>
      ) : (
        <Animated.View entering={FadeIn.duration(180)} style={styles.flex}>
          <FlatList
            data={feed.products}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={gridStyles.columns}
            ItemSeparatorComponent={GridSeparator}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              feed.isError ? (
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Couldn't load products"
                  message="Check your connection and try again."
                  actionLabel="Retry"
                  onAction={() => feed.retry()}
                  fill={false}
                />
              ) : (
                <EmptyState
                  icon="funnel-outline"
                  title="No products found"
                  message="Try adjusting your search or filter criteria."
                  actionLabel={filtersActive || selectedCategory ? 'Clear filters' : undefined}
                  onAction={() => {
                    clearFilters();
                    setSelectedCategory('');
                  }}
                  fill={false}
                />
              )
            }
            ListFooterComponent={
              feed.isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} color={colors.primary} /> : null
            }
            contentContainerStyle={styles.listContent}
            onEndReached={feed.loadMore}
            onEndReachedThreshold={0.6}
            refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            windowSize={9}
            removeClippedSubviews
          />
        </Animated.View>
      )}

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
  fullWidth: { alignSelf: 'stretch' },
  finding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  gate: { flexGrow: 1, alignItems: 'center', padding: SCREEN_PADDING + spacing.sm, paddingTop: spacing.xxxl, gap: spacing.md },
  gateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  gateText: { marginBottom: spacing.md },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch', marginVertical: spacing.sm },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  loginLink: { paddingVertical: spacing.lg },
  toolbar: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  chips: { paddingHorizontal: SCREEN_PADDING, gap: spacing.sm },
  listHeader: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  nudge: { backgroundColor: colors.secondarySoft, borderColor: '#FDE68A' },
  info: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' },
  bannerText: { flex: 1 },
  resultsRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs },
  listContent: { paddingBottom: layout.floatingCartBarSpace + spacing.lg, flexGrow: 1 },
  skeletonWrap: { paddingBottom: layout.floatingCartBarSpace },
  footerSpinner: { paddingVertical: spacing.xl },
});
