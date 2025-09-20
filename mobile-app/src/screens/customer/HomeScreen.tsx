import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useProducts, useCategories } from '../../hooks/useProducts';
import { THEME, SIZES, SHADOWS } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProductCard from '../../components/customer/ProductCard';
import CustomHeader from '../../components/navigation/CustomHeader';
import CustomLoader from '../../components/ui/CustomLoader';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { getCartCount, getTotalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: productsResponse,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useProducts({
    page: 1,
    limit: 20,
    search: searchQuery,
    category: selectedCategory || undefined,
    area: user?.area,
  });

  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
  } = useCategories();


  const products = productsResponse?.data?.products || [];
  const categories = categoriesResponse?.data || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchProducts();
    setRefreshing(false);
  };

  const renderWelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <Text style={styles.welcomeText}>Welcome back, <Text style={styles.userName}>{user?.name}!</Text></Text>
    </View>
  );


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

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        {categories.map((category: any) => (
          <TouchableOpacity
            key={category._id}
            style={[
              styles.categoryChip,
              selectedCategory === category._id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === category._id ? null : category._id
            )}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category._id && styles.categoryChipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFeaturedProducts = () => (
    <View style={styles.featuredContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Products</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Products')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {productsLoading ? (
        <CustomLoader visible={true} message="Loading products..." />
      ) : products.length === 0 ? (
        <Card style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={48} color={THEME.textMuted} />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Check back later for new products'}
          </Text>
        </Card>
      ) : (
        <FlatList
          data={products.slice(0, 6)}
          numColumns={2}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.productCardContainer}>
              <ProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
              />
            </View>
          )}
          scrollEnabled={false}
        />
      )}
    </View>
  );


  return (
    <View style={styles.container}>
      <CustomHeader
        title=""
        subtitle=""
        showBack={false}
        showCart={true}
        showProfile={true}
        showSearch={true}
        onCartPress={() => navigation.navigate('Cart')}
        onProfilePress={() => navigation.navigate('Profile')}
        onSearchPress={() => navigation.navigate('Products')}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeSection()}
        {renderSearchBar()}
        {renderCategories()}
        {renderFeaturedProducts()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: SIZES.tabBarHeight + SIZES.lg,
  },
  welcomeSection: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: THEME.background,
  },
  welcomeText: {
    fontSize: 18,
    color: THEME.textSecondary,
    lineHeight: 24,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  searchContainer: {
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: THEME.border,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: 16,
    color: THEME.text,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  categoriesContainer: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  categoryChip: {
    backgroundColor: THEME.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.lg,
    marginLeft: SIZES.lg,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  categoryChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: THEME.text,
  },
  categoryChipTextActive: {
    color: THEME.background,
    fontWeight: '600',
  },
  featuredContainer: {
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
  },
  seeAllText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: SIZES.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SIZES.xl,
    marginHorizontal: SIZES.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  productCardContainer: {
    flex: 0.5,
  },
});

export default HomeScreen;