import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { THEME, SIZES } from '../../theme';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { addToCart, updateQuantity, removeFromCart, isInCart, getCartItem } = useCart();
  const cartItem = getCartItem(product._id);

  const availableStock = product.totalStock || product.stock || 0;

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleQuantityChange = (e: any, change: number) => {
    e.stopPropagation();
    if (cartItem) {
      const newQuantity = cartItem.quantity + change;
      if (newQuantity <= 0) {
        removeFromCart(product._id);
      } else if (newQuantity <= availableStock) {
        updateQuantity(product._id, newQuantity);
      }
    }
  };

  const handleAddToCartWithQuantity = (e: any) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <Card onPress={onPress} style={styles.container}>
      <View style={styles.imageContainer}>
        {product.images && product.images.length > 0 ? (
          <Image 
            source={{ uri: product.images[0] }} 
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={THEME.textMuted} />
          </View>
        )}
        {availableStock <= 5 && availableStock > 0 && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
        {availableStock === 0 && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{product.price}</Text>
          <Text style={styles.unit}>/{product.unit}</Text>
        </View>

        <View style={styles.categoryContainer}>
          <Text style={styles.category}>{product.category?.name}</Text>
        </View>

        <View style={styles.actionContainer}>
          {isInCart(product._id) ? (
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={(e) => handleQuantityChange(e, -1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={THEME.primary} />
              </TouchableOpacity>
              
              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityText}>{cartItem?.quantity || 0}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={(e) => handleQuantityChange(e, 1)}
                activeOpacity={0.7}
                disabled={availableStock <= (cartItem?.quantity || 0)}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color={availableStock <= (cartItem?.quantity || 0) ? THEME.textMuted : THEME.primary} 
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title="Add to Cart"
              onPress={handleAddToCartWithQuantity}
              size="small"
              disabled={availableStock === 0}
              style={styles.addButton}
            />
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: SIZES.xs,
    padding: 0,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
    borderTopLeftRadius: SIZES.md,
    borderTopRightRadius: SIZES.md,
    overflow: 'hidden',
  },
  image: {
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
  lowStockBadge: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    backgroundColor: THEME.warning,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.xs,
  },
  lowStockText: {
    color: THEME.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  outOfStockBadge: {
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: SIZES.md,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SIZES.sm,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  unit: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginLeft: SIZES.xs,
  },
  categoryContainer: {
    marginBottom: SIZES.sm,
  },
  category: {
    fontSize: 12,
    color: THEME.textMuted,
    backgroundColor: THEME.surface,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.xs,
    alignSelf: 'flex-start',
  },
  actionContainer: {
    marginTop: 'auto',
  },
  addButton: {
    paddingVertical: SIZES.sm,
  },
  inCartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
  },
  inCartText: {
    marginLeft: SIZES.xs,
    color: THEME.success,
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surface,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  quantityButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  quantityDisplay: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: THEME.background,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: THEME.border,
    minWidth: 50,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
  },
});

export default ProductCard;