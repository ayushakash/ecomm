import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';
import { useProductById } from '../../hooks/useProducts';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomLoader from '../../components/ui/CustomLoader';

const { width } = Dimensions.get('window');

interface ProductDetailScreenProps {
  navigation: any;
  route: { params: { productId: string } };
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { productId } = route.params;
  const { addToCart, updateQuantity, getCartItem, isInCart } = useCart();
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const {
    data: productResponse,
    isLoading,
    error,
  } = useProductById(productId);

  const product = productResponse?.data;
  const cartItem = getCartItem(productId);

  const handleAddToCart = () => {
    if (product) {
      const success = addToCart(product, quantity);
      
      if (success) {
        Alert.alert(
          'Added to Cart',
          `${quantity} ${product.unit || 'unit'}${quantity > 1 ? 's' : ''} of ${product.name || 'product'} added to cart`,
          [
            { text: 'Continue Shopping', style: 'default' },
            { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
          ]
        );
      }
    }
  };

  const handleBuyNow = () => {
    if (product) {
      const success = addToCart(product, quantity);
      if (success) {
        navigation.navigate('Cart');
      }
    }
  };

  const handleShare = async () => {
    if (product) {
      try {
        await Share.share({
          message: `Check out ${product.name || 'this product'} - ₹${product.price || 0}/${product.unit || 'unit'}`,
          title: product.name || 'Product',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const adjustQuantity = (change: number) => {
    const newQuantity = quantity + change;
    const availableStock = product?.totalStock || product?.stock || 0;
    if (newQuantity >= 1 && newQuantity <= availableStock) {
      setQuantity(newQuantity);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color={THEME.text} />
      </TouchableOpacity>
      
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={THEME.text} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.headerButton}>
          <Ionicons name="cart-outline" size={24} color={THEME.text} />
          {cartItem && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItem.quantity || 0}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImageGallery = () => (
    <View style={styles.imageGalleryContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const imageWidth = width - (SIZES.lg * 4); // Account for card margins and padding
            const index = Math.round(event.nativeEvent.contentOffset.x / imageWidth);
            setSelectedImageIndex(index);
          }}
        >
          {product?.images && product.images.length > 0 ? (
            product.images.map((image: string, index: number) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
              </View>
            ))
          ) : (
            <View style={styles.imageContainer}>
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={80} color={THEME.textMuted} />
              </View>
            </View>
          )}
        </ScrollView>

        {product?.images && product.images.length > 1 && (
          <View style={styles.imageIndicators}>
            {product.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.imageIndicator,
                  index === selectedImageIndex && styles.imageIndicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {(product?.totalStock || product?.stock) === 0 && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>
  );

  const renderProductInfo = () => {
    if (!product) return null;
    
    return (
    <View style={styles.productInfoSection}>
      <Text style={styles.productName}>{product.name || 'Product Name'}</Text>
      
      <View style={styles.priceContainer}>
        <Text style={styles.price}>₹{product.price || 0}</Text>
        <Text style={styles.unit}>/{product.unit || 'unit'}</Text>
      </View>

      <View style={styles.categoryContainer}>
        <Ionicons name="pricetag-outline" size={16} color={THEME.primary} />
        <Text style={styles.category}>{product.category?.name || 'No category'}</Text>
      </View>

      <View style={styles.stockContainer}>
        <Ionicons
          name={(product?.totalStock || product?.stock) > 0 ? "checkmark-circle" : "alert-circle"}
          size={16}
          color={(product?.totalStock || product?.stock) > 0 ? THEME.success : THEME.error}
        />
        <Text style={[
          styles.stockText,
          { color: (product?.totalStock || product?.stock || 0) > 0 ? THEME.success : THEME.error }
        ]}>
          {(product?.totalStock || product?.stock || 0) > 0 
            ? `${product?.totalStock || product?.stock || 0} ${product?.unit || 'unit'}s available`
            : 'Out of stock'
          }
        </Text>
      </View>

      {product?.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      )}

      <View style={styles.productDetails}>
        <Text style={styles.detailsTitle}>Product Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SKU:</Text>
          <Text style={styles.detailValue}>{product?.sku || 'N/A'}</Text>
        </View>

        {product?.weight && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Weight:</Text>
            <Text style={styles.detailValue}>{product.weight || 0}g</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{product?.category?.name || 'N/A'}</Text>
        </View>
      </View>
    </View>
    );
  };

  const renderQuantitySelector = () => {
    if (!product) return null;
    
    return (
    <View style={styles.quantitySection}>
      <Text style={styles.quantityTitle}>Quantity</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
          onPress={() => adjustQuantity(-1)}
          disabled={quantity <= 1}
        >
          <Ionicons
            name="remove"
            size={20}
            color={quantity <= 1 ? THEME.textMuted : THEME.primary}
          />
        </TouchableOpacity>

        <View style={styles.quantityDisplay}>
          <Text style={styles.quantityText}>{quantity}</Text>
          <Text style={styles.quantityUnit}>{product?.unit || 'unit'}s</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.quantityButton,
            quantity >= (product?.totalStock || product?.stock || 0) && styles.quantityButtonDisabled,
          ]}
          onPress={() => adjustQuantity(1)}
          disabled={quantity >= (product?.totalStock || product?.stock || 0)}
        >
          <Ionicons
            name="add"
            size={20}
            color={quantity >= (product?.totalStock || product?.stock || 0) ? THEME.textMuted : THEME.primary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.totalPrice}>
        Total: ₹{((product.price || 0) * quantity).toFixed(2)}
      </Text>
    </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <Button
        title="Add to Cart"
        onPress={handleAddToCart}
        variant="outline"
        style={styles.addToCartButton}
        disabled={(product?.totalStock || product?.stock) === 0}
      />
      
      <Button
        title="Buy Now"
        onPress={handleBuyNow}
        style={styles.buyNowButton}
        disabled={(product?.totalStock || product?.stock) === 0}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomLoader visible={true} message="Loading product details..." />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={THEME.error} />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorMessage}>
            The product you are looking for does not exist or has been removed.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.productCard}>
          {renderImageGallery()}
          {renderProductInfo()}
          {renderQuantitySelector()}
        </Card>
      </ScrollView>

      {renderActionButtons()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerButton: {
    padding: SIZES.sm,
    position: 'relative',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: THEME.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: THEME.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  productCard: {
    margin: SIZES.lg,
    padding: SIZES.lg,
  },
  imageGalleryContainer: {
    position: 'relative',
    marginBottom: SIZES.lg,
  },
  imageContainer: {
    width: width - (SIZES.lg * 4), // Account for card margins and padding
    height: width - (SIZES.lg * 4),
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.border,
  },
  imageIndicatorActive: {
    backgroundColor: THEME.primary,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: THEME.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
  productInfoSection: {
    marginBottom: SIZES.lg,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SIZES.md,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  unit: {
    fontSize: 16,
    color: THEME.textSecondary,
    marginLeft: SIZES.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  category: {
    fontSize: 14,
    color: THEME.primary,
    marginLeft: SIZES.sm,
    fontWeight: '500',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  stockText: {
    fontSize: 14,
    marginLeft: SIZES.sm,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginBottom: SIZES.lg,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  description: {
    fontSize: 16,
    color: THEME.textSecondary,
    lineHeight: 24,
  },
  productDetails: {
    marginTop: SIZES.lg,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '500',
  },
  quantitySection: {
    marginBottom: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: SIZES.lg,
  },
  quantityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.lg,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    borderColor: THEME.border,
    backgroundColor: THEME.borderLight,
  },
  quantityDisplay: {
    alignItems: 'center',
    marginHorizontal: SIZES.xl,
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
  },
  quantityUnit: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: SIZES.xs,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.primary,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    backgroundColor: THEME.background,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: SIZES.md,
  },
  addToCartButton: {
    flex: 1,
  },
  buyNowButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  errorMessage: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.xl,
  },
  goBackButton: {
    paddingHorizontal: SIZES.xl,
  },
});

export default ProductDetailScreen;