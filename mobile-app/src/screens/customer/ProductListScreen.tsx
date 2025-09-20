import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useProducts, useCategories } from '../../hooks/useProducts';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProductCard from '../../components/customer/ProductCard';
import CustomHeader from '../../components/navigation/CustomHeader';
import CustomLoader from '../../components/ui/CustomLoader';

interface ProductListScreenProps {
  navigation: any;
  route?: any;
}

const ProductListScreen: React.FC<ProductListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState(route?.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || '');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'newest'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [categoryLoading, setCategoryLoading] = useState(false);

  const {
    data: productsResponse,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProducts({
    page: 1,
    limit: 20,
    search: searchQuery,
    category: selectedCategory || undefined,
    area: user?.area,
  });

  const { data: categoriesResponse } = useCategories();
  
  const products = productsResponse?.data?.products || [];
  const categories = categoriesResponse?.data || [];

  // Filter and sort products locally
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        const price = product.price;
        const min = parseFloat(priceRange.min) || 0;
        const max = parseFloat(priceRange.max) || Infinity;
        return price >= min && price <= max;
      });
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, sortBy, priceRange]);


  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={THEME.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={THEME.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCategoryTabs = () => (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => {
            setCategoryLoading(true);
            setTimeout(() => {
              setSelectedCategory('');
              setCategoryLoading(false);
            }, 800);
          }}
        >
          <Ionicons name="apps-outline" size={16} color={!selectedCategory ? THEME.background : THEME.textMuted} />
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((category: any) => (
          <TouchableOpacity
            key={category._id}
            style={[
              styles.categoryChip,
              selectedCategory === category._id && styles.categoryChipActive
            ]}
            onPress={() => {
              setCategoryLoading(true);
              setTimeout(() => {
                setSelectedCategory(
                  selectedCategory === category._id ? '' : category._id
                );
                setCategoryLoading(false);
              }, 800);
            }}
          >
            <Ionicons name="pricetag-outline" size={16} color={selectedCategory === category._id ? THEME.background : THEME.textMuted} />
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category._id && styles.categoryChipTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSortAndFilter = () => (
    <View style={styles.sortFilterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'newest' && styles.sortChipActive]}
          onPress={() => setSortBy('newest')}
        >
          <Ionicons name="time-outline" size={16} color={sortBy === 'newest' ? THEME.background : THEME.textMuted} />
          <Text style={[
            styles.sortChipText,
            sortBy === 'newest' && styles.sortChipTextActive
          ]}>
            Newest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'price' && styles.sortChipActive]}
          onPress={() => setSortBy('price')}
        >
          <Ionicons name="pricetag-outline" size={16} color={sortBy === 'price' ? THEME.background : THEME.textMuted} />
          <Text style={[
            styles.sortChipText,
            sortBy === 'price' && styles.sortChipTextActive
          ]}>
            Price
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'name' && styles.sortChipActive]}
          onPress={() => setSortBy('name')}
        >
          <Ionicons name="text-outline" size={16} color={sortBy === 'name' ? THEME.background : THEME.textMuted} />
          <Text style={[
            styles.sortChipText,
            sortBy === 'name' && styles.sortChipTextActive
          ]}>
            Name
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={styles.resultCount}>
        {filteredAndSortedProducts.length} products found
      </Text>
    </View>
  );

  const renderProductItem = ({ item }: { item: any }) => (
    <View style={styles.productItemContainer}>
      <ProductCard
        product={item}
        onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
      />
    </View>
  );

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.filterModal}>
        <View style={styles.filterHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={THEME.text} />
          </TouchableOpacity>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity onPress={() => {
            setPriceRange({ min: '', max: '' });
            setSelectedCategory('');
          }}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceRangeContainer}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                value={priceRange.min}
                onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: text }))}
                keyboardType="numeric"
                placeholderTextColor={THEME.textMuted}
              />
              <Text style={styles.priceRangeSeparator}>to</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                value={priceRange.max}
                onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: text }))}
                keyboardType="numeric"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Categories</Text>
            {categories.map((category: any) => (
              <TouchableOpacity
                key={category._id}
                style={styles.categoryFilterOption}
                onPress={() => setSelectedCategory(
                  selectedCategory === category._id ? '' : category._id
                )}
              >
                <Text style={styles.categoryFilterText}>{category.name}</Text>
                <Ionicons
                  name={selectedCategory === category._id ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={selectedCategory === category._id ? THEME.primary : THEME.border}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.filterActions}>
          <Button
            title="Apply Filters"
            onPress={() => setShowFilters(false)}
            style={styles.applyFiltersButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={80} color={THEME.textMuted} />
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No products match "${searchQuery}"`
          : selectedCategory
          ? "No products in this category"
          : "Check back later for new products"
        }
      </Text>
      {(searchQuery || selectedCategory) && (
        <Button
          title="Clear Filters"
          onPress={() => {
            setSearchQuery('');
            setSelectedCategory('');
            setPriceRange({ min: '', max: '' });
          }}
          variant="outline"
          style={styles.clearFiltersButton}
        />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="Products"
          showBack={true}
          showCart={true}
          onBackPress={() => navigation.goBack()}
          onCartPress={() => navigation.navigate('Cart')}
        />
        <CustomLoader visible={true} message="Loading products..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Products"
        subtitle={`${filteredAndSortedProducts.length} products found`}
        showBack={true}
        showCart={true}
        showProfile={false}
        showSearch={false}
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate('Cart')}
        rightComponent={
          <TouchableOpacity
            style={styles.filterHeaderButton}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={24} color={THEME.background} />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.content}>
        {renderSearchBar()}
        {renderCategoryTabs()}
      
        {filteredAndSortedProducts.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredAndSortedProducts}
            numColumns={2}
            keyExtractor={(item) => item._id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.productsList}
            onEndReached={fetchNextPage}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextPage ? (
              <CustomLoader visible={true} message="Loading more products..." />
            ) : null}
          />
        )}
      </View>

      {renderFilterModal()}
      <CustomLoader visible={categoryLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    flex: 1,
  },
  filterHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.lg,
    borderWidth: 1,
    borderColor: THEME.border,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: 15,
    color: THEME.text,
    paddingVertical: 0,
  },
  categoryContainer: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.lg,
    marginRight: SIZES.xs,
    borderWidth: 1,
    borderColor: THEME.border,
    height: 32,
  },
  categoryChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: THEME.textMuted,
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: THEME.background,
    fontWeight: '600',
  },
  sortFilterContainer: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.lg,
    marginRight: SIZES.xs,
    borderWidth: 1,
    borderColor: THEME.border,
    height: 32,
  },
  sortChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  sortChipText: {
    fontSize: 12,
    color: THEME.textMuted,
    marginLeft: 4,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: THEME.background,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  productsList: {
    padding: SIZES.sm,
  },
  productItemContainer: {
    flex: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.xl,
  },
  clearFiltersButton: {
    paddingHorizontal: SIZES.xl,
  },
  filterModal: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  clearFiltersText: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: 16,
    color: THEME.text,
    backgroundColor: THEME.surface,
  },
  priceRangeSeparator: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  categoryFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  categoryFilterText: {
    fontSize: 16,
    color: THEME.text,
  },
  filterActions: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  applyFiltersButton: {
    paddingVertical: SIZES.lg,
  },
});

export default ProductListScreen;