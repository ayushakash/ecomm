import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem as CartItemType } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { THEME, SIZES } from '../../theme';
import Card from '../ui/Card';

interface CartItemProps {
  item: CartItemType;
  onPress?: () => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onPress }) => {
  const { updateQuantity, removeFromCart } = useCart();

  const handleQuantityChange = (change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      removeFromCart(item._id);
    } else if (newQuantity <= item.stock) {
      updateQuantity(item._id, newQuantity);
    }
  };

  const handleRemove = () => {
    removeFromCart(item._id);
  };

  const itemTotal = item.price * item.quantity;

  return (
    <Card onPress={onPress} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <View style={styles.imageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={24} color={THEME.textMuted} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={20} color={THEME.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{item.price}</Text>
            <Text style={styles.unit}>/{item.unit}</Text>
          </View>

          <View style={styles.stockInfo}>
            <Text style={styles.stockText}>
              Stock: {item.stock} {item.unit}s available
            </Text>
          </View>

          {item.quantity >= item.stock && (
            <View style={styles.maxQuantityWarning}>
              <Ionicons name="warning-outline" size={16} color={THEME.warning} />
              <Text style={styles.warningText}>Maximum quantity reached</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              item.quantity <= 1 && styles.quantityButtonDisabled,
            ]}
            onPress={() => handleQuantityChange(-1)}
            disabled={item.quantity <= 1}
          >
            <Ionicons
              name="remove"
              size={16}
              color={item.quantity <= 1 ? THEME.textMuted : THEME.primary}
            />
          </TouchableOpacity>

          <Text style={styles.quantity}>{item.quantity}</Text>

          <TouchableOpacity
            style={[
              styles.quantityButton,
              item.quantity >= item.stock && styles.quantityButtonDisabled,
            ]}
            onPress={() => handleQuantityChange(1)}
            disabled={item.quantity >= item.stock}
          >
            <Ionicons
              name="add"
              size={16}
              color={item.quantity >= item.stock ? THEME.textMuted : THEME.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total: </Text>
          <Text style={styles.totalPrice}>₹{itemTotal.toFixed(2)}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.lg,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    paddingTop: SIZES.md,
    paddingHorizontal: SIZES.md,
  },
  leftColumn: {
    width: 80,
    marginRight: SIZES.sm,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: SIZES.sm,
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
  detailsContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginRight: SIZES.sm,
  },
  removeButton: {
    padding: SIZES.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SIZES.xs,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  unit: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginLeft: SIZES.xs,
  },
  stockInfo: {
    marginBottom: SIZES.md,
  },
  stockText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    paddingTop: SIZES.sm,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  quantityButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    paddingHorizontal: SIZES.md,
    minWidth: 36,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
  },
  maxQuantityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
    backgroundColor: THEME.warning + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.xs,
  },
  warningText: {
    fontSize: 12,
    color: THEME.warning,
    marginLeft: SIZES.xs,
    fontWeight: '500',
  },
});

export default CartItem;