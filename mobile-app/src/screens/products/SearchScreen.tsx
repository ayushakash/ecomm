import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  CategoryTile,
  Chip,
  EmptyState,
  FloatingCartBar,
  Icon,
  ProductCard,
  Screen,
  SearchBar,
  Text,
} from '../../components/ui';
import { useLocation } from '../../contexts/LocationContext';
import { useCategories } from '../../hooks/queries';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, layout, radii, SCREEN_PADDING, spacing } from '../../theme';
import type { Product } from '../../types/models';
import { GridSeparator, ProductGridSkeleton, gridStyles, useGridCellWidth } from './components/ProductGridSkeleton';
import { useProductFeed } from './components/useProductFeed';

const RECENT_KEY = 'chardeevari.recentSearches';
const MAX_RECENT = 8;
const POPULAR = ['Cement', 'TMT steel bars', 'Red bricks', 'River sand', 'Stone chips', 'M-Sand', 'Fly ash bricks'];

/** Recent searches persisted in AsyncStorage (newest first, case-insensitive de-dupe). */
function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setRecent(parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT));
      })
      .catch(() => {});
  }, []);

  const persist = (next: string[]) => {
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  };

  const add = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecent((prev) =>
      persist([clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT)),
    );
  }, []);

  const remove = useCallback((term: string) => setRecent((prev) => persist(prev.filter((t) => t !== term))), []);
  const clear = useCallback(() => setRecent(persist([])), []);

  return { recent, add, remove, clear };
}

/**
 * Product search (web Home search: 150 ms debounce, merchant-filtered).
 * Empty state: recent + popular searches and category tiles; results: category scope chips + infinite grid.
 */
export default function SearchScreen({ navigation, route }: RootStackScreenProps<'Search'>) {
  const { width } = useWindowDimensions();
  const tileSize = Math.floor((width - SCREEN_PADDING * 2 - spacing.sm * 4) / 5);
  const { activeMerchantIds, selectedCity, selectedAddress, isLoadingMerchants } = useLocation();
  const { data: categories } = useCategories();
  const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentSearches();

  const [text, setText] = useState(route.params?.query ?? '');
  const [categoryId, setCategoryId] = useState(route.params?.categoryId ?? '');
  const search = useDebouncedValue(text.trim(), 150);

  const active = search.length > 0 || categoryId !== '';
  const unserviceable = !isLoadingMerchants && activeMerchantIds === undefined && !!(selectedCity || selectedAddress);
  const locationName = selectedAddress?.city || selectedCity?.city;

  const query = useMemo(
    () => ({ search: search || undefined, category: categoryId || undefined, merchantIds: activeMerchantIds }),
    [search, categoryId, activeMerchantIds],
  );
  const feed = useProductFeed(query, 'latest', active && !unserviceable);

  const matchingCategories = useMemo(() => {
    const q = search.toLowerCase();
    if (!q || !categories) return [];
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const runSearch = (term: string) => {
    setText(term);
    addRecent(term);
    Keyboard.dismiss();
  };

  const openProduct = useCallback(
    (product: Product) => {
      if (search) addRecent(search);
      navigation.navigate('ProductDetail', { productId: product._id, product });
    },
    [addRecent, navigation, search],
  );

  const cellWidth = useGridCellWidth();
  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <ProductCard product={item} width={cellWidth} priority={index < 2} onPress={openProduct} />
    ),
    [cellWidth, openProduct],
  );

  const scopeName = categoryId ? categories?.find((c) => c._id === categoryId)?.name : undefined;

  const resultsHeader = (
    <View style={styles.resultsHeader}>
      {matchingCategories.length > 0 && !categoryId && (
        <View style={styles.suggestions}>
          {matchingCategories.slice(0, 4).map((c) => (
            <Pressable
              key={c._id}
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab', params: { categoryId: c._id } })}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${c.name}`}
              style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
            >
              <Icon name="grid-outline" size={16} color="textSecondary" />
              <Text variant="body" style={styles.flex} numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="caption" color="secondaryDark" weight="bold">
                Category
              </Text>
              <Icon name="chevron-forward" size={14} color="textMuted" />
            </Pressable>
          ))}
        </View>
      )}
      <Text variant="h3">
        {search ? `Results for “${search}”` : scopeName ?? 'Products'}
        {search && scopeName ? (
          <Text variant="h3" color="textSecondary">
            {' '}
            in {scopeName}
          </Text>
        ) : null}
      </Text>
      {!feed.isLoading && (
        <Text variant="caption" color="textSecondary">
          {feed.totalProducts} {feed.totalProducts === 1 ? 'product' : 'products'} found
        </Text>
      )}
    </View>
  );

  const renderResults = () => {
    if (unserviceable) {
      return (
        <EmptyState
          icon="storefront-outline"
          title={`No merchants in ${locationName ?? 'your area'} yet`}
          message="We're expanding to new areas soon. Try a different location or check back later."
          actionLabel="Change location"
          onAction={() => navigation.navigate('LocationPicker')}
        />
      );
    }
    if (feed.isLoading) {
      return (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.skeletonWrap}>
          {resultsHeader}
          <ProductGridSkeleton />
        </ScrollView>
      );
    }
    return (
      <Animated.View entering={FadeIn.duration(160)} style={styles.flex}>
        <FlatList
          data={feed.products}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={gridStyles.columns}
          ItemSeparatorComponent={GridSeparator}
          ListHeaderComponent={resultsHeader}
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
                icon="search-outline"
                title="No products found"
                message={
                  categoryId
                    ? 'Nothing matches in this category. Try searching all categories.'
                    : 'Try a different word, like “cement” or “bricks”.'
                }
                actionLabel={categoryId ? 'Search all categories' : undefined}
                onAction={() => setCategoryId('')}
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          removeClippedSubviews
        />
      </Animated.View>
    );
  };

  return (
    <Screen safeTop>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <Icon name="arrow-back" size={24} />
        </Pressable>
        <SearchBar
          value={text}
          onChangeText={setText}
          onSubmit={runSearch}
          autoFocus
          style={styles.flex}
        />
      </View>

      {categories && categories.length > 0 && active && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scopeChips}
          style={styles.scopeBar}
        >
          <Chip label="All" selected={categoryId === ''} onPress={() => setCategoryId('')} />
          {categories.map((c) => (
            <Chip key={c._id} label={c.name} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
          ))}
        </ScrollView>
      )}

      {active ? (
        renderResults()
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.idle}
        >
          {recent.length > 0 && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text variant="h3">Recent searches</Text>
                <Pressable onPress={clearRecent} hitSlop={layout.hitSlop} accessibilityRole="button" accessibilityLabel="Clear recent searches">
                  <Text variant="label" color="secondaryDark" weight="bold">
                    Clear all
                  </Text>
                </Pressable>
              </View>
              <View style={styles.recentList}>
                {recent.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => runSearch(term)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${term}`}
                    style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
                  >
                    <Icon name="time-outline" size={18} color="textMuted" />
                    <Text variant="body" style={styles.flex} numberOfLines={1}>
                      {term}
                    </Text>
                    <Pressable
                      onPress={() => removeRecent(term)}
                      hitSlop={layout.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${term} from recent searches`}
                    >
                      <Icon name="close" size={18} color="textMuted" />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(40).duration(200)} style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Popular searches
            </Text>
            <View style={styles.popular}>
              {POPULAR.map((term) => (
                <Chip key={term} label={term} icon="trending-up" onPress={() => runSearch(term)} />
              ))}
            </View>
          </Animated.View>

          {categories && categories.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(200)} style={styles.section}>
              <Text variant="h3" style={styles.sectionTitle}>
                Browse categories
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map((c) => (
                  <CategoryTile
                    key={c._id}
                    category={c}
                    size={tileSize}
                    onPress={() => {
                      Keyboard.dismiss();
                      setCategoryId(c._id);
                    }}
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}

      <FloatingCartBar />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: SCREEN_PADDING,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  back: { width: layout.touchMin, height: layout.touchMin, alignItems: 'center', justifyContent: 'center' },
  scopeBar: {
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scopeChips: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.sm, gap: spacing.sm },
  idle: { paddingVertical: spacing.lg, paddingBottom: layout.floatingCartBarSpace, gap: spacing.xxl },
  section: { paddingHorizontal: SCREEN_PADDING },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { marginBottom: spacing.md },
  recentList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  recentRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  popular: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.md },
  resultsHeader: { paddingHorizontal: SCREEN_PADDING, paddingVertical: spacing.md, gap: 2 },
  suggestions: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  suggestionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  listContent: { paddingBottom: layout.floatingCartBarSpace + spacing.lg, flexGrow: 1 },
  skeletonWrap: { paddingBottom: layout.floatingCartBarSpace },
  footerSpinner: { paddingVertical: spacing.xl },
});
