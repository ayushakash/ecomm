import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCalculatePricing, useSettings } from '../../hooks/useSettings';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CartItem from '../../components/customer/CartItem';
import CustomHeader from '../../components/navigation/CustomHeader';
import CustomModal from '../../components/ui/CustomModal';

interface CartScreenProps {
  navigation: any;
}

const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { 
    cart, 
    clearCart, 
    getCartTotal, 
    getCartCount, 
    getTotalItems,
    isMinimumOrderMet,
    getMinimumOrderValue,
    getRemainingForMinimum
  } = useCart();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const insets = useSafeAreaInsets();
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // Prepare items for pricing calculation
  const cartItems = useMemo(() => 
    cart.map(item => ({
      totalPrice: item.price * item.quantity,
      quantity: item.quantity,
      weight: item.weight || 0
    })), [cart]
  );

  // Get app settings for minimum order validation
  const { data: settingsData } = useSettings();

  const subtotal = getCartTotal();
  const minimumOrderValue = getMinimumOrderValue();
  const isMinOrderMet = isMinimumOrderMet();
  const remainingForMinimum = getRemainingForMinimum();

  const handleClearCart = () => {
    setClearModalVisible(true);
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }
    
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add some items to your cart first.');
      return;
    }
    
    if (!isMinOrderMet) {
      Alert.alert(
        'Minimum Order Required',
        `Please add items worth ₹${(remainingForMinimum || 0).toFixed(2)} more to meet the minimum order value of ₹${(minimumOrderValue || 0).toLocaleString()}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('Checkout');
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <CartItem 
      item={item} 
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
    />
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color={THEME.textMuted} />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add some products to get started with your order
      </Text>
      
      <Button
        title="Browse Products"
        onPress={() => navigation.navigate('Products')}
        style={styles.browseButton}
      />
    </View>
  );

  const renderCartSummary = () => (
    <Card style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Cart Summary</Text>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          Items ({getTotalItems()} items)
        </Text>
        <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalValue}>₹{subtotal.toLocaleString()}</Text>
      </View>

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={16} color={THEME.info} />
        <Text style={styles.noteText}>
          Tax, delivery charges, and other fees will be calculated at checkout
        </Text>
      </View>

      {/* Login Required Message */}
      {!isLoggedIn && (
        <View style={styles.warningContainer}>
          <Ionicons name="information-circle-outline" size={16} color={THEME.info} />
          <Text style={styles.warningText}>
            Please login to proceed with checkout and place your order
          </Text>
        </View>
      )}

      {/* Minimum Order Warning */}
      {isLoggedIn && !isMinOrderMet && (
        <View style={[styles.warningContainer, styles.errorContainer]}>
          <Ionicons name="warning-outline" size={16} color={THEME.warning} />
          <Text style={[styles.warningText, styles.errorText]}>
            Add items worth ₹{(remainingForMinimum || 0).toLocaleString()} more to meet minimum order value of ₹{(minimumOrderValue || 0).toLocaleString()}
          </Text>
        </View>
      )}
    </Card>
  );

  const renderCartActions = () => (
    <View style={[
      styles.actionsContainer,
      { 
        paddingBottom: Math.max(insets.bottom, SIZES.sm) + SIZES.tabBarHeight,
        bottom: 0,
        position: 'absolute',
        left: 0,
        right: 0
      }
    ]}>
      <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
        <Ionicons name="trash-outline" size={20} color={THEME.error} />
        <Text style={styles.clearButtonText}>Clear Cart</Text>
      </TouchableOpacity>

      <Button
        title={
          !isLoggedIn
            ? 'Login to Checkout'
            : isMinOrderMet
            ? `Checkout (₹${subtotal.toLocaleString()})`
            : `Minimum Order: ₹${(minimumOrderValue || 0).toLocaleString()}`
        }
        onPress={handleCheckout}
        style={[
          styles.checkoutButton,
          isLoggedIn && !isMinOrderMet && styles.disabledButton
        ]}
        disabled={isLoggedIn && !isMinOrderMet}
      />
    </View>
  );

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="My Cart"
          subtitle="Your cart is empty"
          showBack={false}
          showCart={false}
          showProfile={true}
          onHomePress={() => navigation.navigate('Home')}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        {renderEmptyCart()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title="My Cart"
        subtitle={`${getCartCount()} ${getCartCount() === 1 ? 'item' : 'items'} - ₹${subtotal.toLocaleString()}`}
        showBack={false}
        showCart={false}
        showProfile={true}
        onHomePress={() => navigation.navigate('Home')}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <FlatList
        data={cart}
        keyExtractor={(item) => item._id}
        renderItem={renderCartItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: SIZES.tabBarHeight + Math.max(insets.bottom, SIZES.md) + 80 } // Extra padding for action buttons
        ]}
        ListFooterComponent={renderCartSummary}
      />

      {renderCartActions()}

      {/* Clear Cart Modal */}
      <CustomModal
        visible={clearModalVisible}
        onClose={() => setClearModalVisible(false)}
        title="Clear Cart? 🗑️"
        message="Are you sure you want to remove all items from your cart? This action cannot be undone."
        type="warning"
        buttons={[
          { text: 'Cancel', onPress: () => setClearModalVisible(false), style: 'secondary' },
          {
            text: 'Clear Cart',
            onPress: () => {
              setClearModalVisible(false);
              clearCart();
            },
            style: 'danger'
          }
        ]}
      />

      {/* Login Required Modal */}
      <CustomModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        title="Login Required 🔐"
        message="Please login to proceed with checkout and place your order."
        type="info"
        buttons={[
          { text: 'Cancel', onPress: () => setLoginModalVisible(false), style: 'secondary' },
          {
            text: 'Login',
            onPress: () => {
              setLoginModalVisible(false);
              navigation.navigate('Login', { fromCheckout: true });
            }
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContainer: {
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
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
    marginBottom: SIZES.xl,
    lineHeight: 24,
  },
  browseButton: {
    paddingHorizontal: SIZES.xl,
  },
  summaryContainer: {
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    padding: SIZES.lg,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  freeDeliveryText: {
    fontSize: 12,
    color: THEME.success,
    fontWeight: '500',
  },
  freePrice: {
    color: THEME.success,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: SIZES.md,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  totalValueContainer: {
    alignItems: 'flex-end',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SIZES.md,
    backgroundColor: THEME.info + '10',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
  },
  noteText: {
    fontSize: 12,
    color: THEME.info,
    marginLeft: SIZES.sm,
    flex: 1,
    lineHeight: 16,
  },
  freeDeliveryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.md,
    backgroundColor: THEME.info + '20',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
  },
  hintText: {
    fontSize: 12,
    color: THEME.info,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    backgroundColor: THEME.background,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: SIZES.md,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderWidth: 1,
    borderColor: THEME.error,
    borderRadius: SIZES.sm,
    backgroundColor: 'transparent',
    minHeight: 44,
    flex: 0.35,
  },
  clearButtonText: {
    color: THEME.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  checkoutButton: {
    flex: 0.65,
    minHeight: 44,
  },
  disabledButton: {
    backgroundColor: THEME.border,
    opacity: 0.6,
  },
  updatingText: {
    fontSize: 12,
    color: THEME.info,
    fontStyle: 'italic',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SIZES.md,
    backgroundColor: THEME.info + '20',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
  },
  errorContainer: {
    backgroundColor: THEME.warning + '20',
  },
  warningText: {
    fontSize: 12,
    color: THEME.info,
    marginLeft: SIZES.sm,
    flex: 1,
    lineHeight: 16,
  },
  errorText: {
    color: THEME.warning,
  },
});

export default CartScreen;