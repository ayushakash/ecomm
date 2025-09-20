import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateOrder } from '../../hooks/useOrders';
import { useSettings, useCalculatePricing } from '../../hooks/useSettings';
import { Address } from '../../types';
import api from '../../services/api';
import { THEME, SIZES, SHADOWS } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import CustomHeader from '../../components/navigation/CustomHeader';

interface CheckoutScreenProps {
  navigation: any;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { cart, getCartTotal, clearCart } = useCart();
  const createOrderMutation = useCreateOrder();
  const { data: settingsResponse } = useSettings();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: user?.name || '',
    phoneNumber: user?.phone || '',
    address: user?.address || '',
    landmark: '',
    area: user?.area || '',
    city: '',
    state: '',
    pincode: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [navigating, setNavigating] = useState(false);

  // Fetch user's saved addresses (only if user is logged in)
  const { data: addressesData, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.addresses.getAllAddresses(),
    enabled: !!user, // Only fetch if user is logged in
  });

  const addresses = addressesData?.data || [];

  // Set default address or first address on load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
      setSelectedAddress(defaultAddress);
      
      // Pre-fill delivery address from selected address
      if (defaultAddress) {
        setDeliveryAddress({
          fullName: defaultAddress.fullName || user?.name || '',
          phoneNumber: defaultAddress.phoneNumber || user?.phone || '',
          address: defaultAddress.addressLine1 || user?.address || '',
          landmark: defaultAddress.landmark || '',
          area: defaultAddress.area || user?.area || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          pincode: defaultAddress.pincode || '',
        });
      }
    }
  }, [addresses, user]); // Removed selectedAddress from dependencies to prevent infinite loop

  // Prepare items for pricing calculation
  const cartItems = useMemo(() => 
    cart.map(item => ({
      totalPrice: item.price * item.quantity,
      quantity: item.quantity,
      weight: item.weight || 0
    })), [cart]
  );

  // Get dynamic pricing from backend
  const { data: pricingData, isLoading: pricingLoading } = useCalculatePricing(
    cartItems,
    user ? { area: user.area } : undefined
  );

  const subtotal = getCartTotal();
  const settings = settingsResponse?.data;
  const minimumOrderValue = settings?.minimumOrderValue || 100;
  const isMinimumOrderMet = subtotal >= minimumOrderValue;

  // Use dynamic pricing if available, fallback to static calculation
  const finalPricing = pricingData?.data || {
    subtotal: subtotal,
    tax: subtotal * 0.1,
    deliveryCharges: subtotal > 500 ? 0 : 50,
    platformFee: 0,
    totalAmount: subtotal + (subtotal * 0.1) + (subtotal > 500 ? 0 : 50)
  };


  const validateAddress = () => {
    // Since we removed manual editing, just check if an address is selected
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address to continue.');
      return false;
    }
    return true;
  };



  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add some items first.');
      return;
    }

    // Validate minimum order value
    if (!isMinimumOrderMet) {
      Alert.alert(
        'Minimum Order Required',
        `Please add items worth ₹${(minimumOrderValue - subtotal).toFixed(2)} more to meet the minimum order value of ₹${minimumOrderValue}.`
      );
      return;
    }

    // Check if user is authenticated - if not, prompt for login
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login or register to place your order',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Register',
            onPress: () => navigation.navigate('Register', { fromCheckout: true }),
          },
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login', { fromCheckout: true }),
          },
        ]
      );
      return;
    }

    if (!validateAddress()) {
      return;
    }

    try {

      // Verify token is present before making the request
      const token = await AsyncStorage.getItem('accessToken');
      console.log('🔑 Order placement - Token check:', token ? 'Present' : 'Missing');
      console.log('👤 Order placement - User:', user?.name, user?.email);
      
      if (!token) {
        console.warn('❌ No token found during order placement');
        Alert.alert(
          'Authentication Error',
          'Session expired. Please login again.',
          [
            {
              text: 'Login',
              onPress: () => navigation.navigate('Login', { fromCheckout: true }),
            },
          ]
        );
        return;
      }

      // Prepare customer address string from selected address
      const fullAddress = `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}${selectedAddress.landmark ? ', ' + selectedAddress.landmark : ''}, ${selectedAddress.area}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`;

      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
        })),
        customerPhone: selectedAddress.phoneNumber,
        customerAddress: fullAddress,
        deliveryInstructions: notes.trim() || undefined,
        paymentMethod,
        deliveryLocation: {
          address: fullAddress,
          area: selectedAddress.area,
          coordinates: selectedAddress?.coordinates || [0, 0],
          isCurrentLocation: false,
          receiverName: selectedAddress.fullName,
          receiverPhone: selectedAddress.phoneNumber
        },
        addressId: selectedAddress._id // Reference to address for fetching receiver details
      };

      console.log('Placing order with data:', orderData);
      console.log('User authenticated:', !!user);
      console.log('Token available:', !!token);

      const orderResponse = await createOrderMutation.mutateAsync(orderData);
      clearCart();

      // Navigate to success screen with order details
      navigation.navigate('OrderSuccess', {
        orderId: orderResponse.data?.order?._id || orderResponse.data?._id,
        orderNumber: orderResponse.data?.order?.orderNumber || orderResponse.data?.orderNumber,
        totalAmount: finalPricing.totalAmount,
      });
    } catch (error: any) {
      console.error('Order placement error:', error);
      
      // Handle specific authentication errors
      if (error?.response?.status === 401) {
        Alert.alert(
          'Authentication Error',
          'Your session has expired. Please login again.',
          [
            {
              text: 'Login',
              onPress: () => navigation.navigate('Login', { fromCheckout: true }),
            },
          ]
        );
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to place order. Please try again.';
        Alert.alert('Order Failed', errorMessage);
      }
    }
  };

  const handleAddressSelect = useCallback((address: Address) => {
    setSelectedAddress(address);
    
    // Pre-fill delivery address from selected address
    setDeliveryAddress({
      fullName: address.fullName || user?.name || '',
      phoneNumber: address.phoneNumber || user?.phone || '',
      address: address.addressLine1 || '',
      landmark: address.landmark || '',
      area: address.area || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
    });
    
    // Clear any existing errors
    setErrors({});
  }, [user]);

  const handleNavigateToAddresses = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    navigation.navigate('AddressManagement');
    setTimeout(() => setNavigating(false), 1000);
  }, [navigation, navigating]);

  const handleNavigateToAddAddress = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    navigation.navigate('AddEditAddress', { mode: 'add' });
    setTimeout(() => setNavigating(false), 1000);
  }, [navigation, navigating]);

  const renderAddressSection = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="location-outline" size={24} color={THEME.primary} />
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {user && (
          <TouchableOpacity
            style={[styles.addAddressButton, navigating && styles.disabledButton]}
            onPress={handleNavigateToAddresses}
            disabled={navigating}
          >
            <Ionicons name="add-circle-outline" size={20} color={THEME.primary} />
            <Text style={styles.addAddressText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Guest User Message */}
      {!user ? (
        <View style={styles.guestAddressContainer}>
          <Ionicons name="person-outline" size={48} color={THEME.textMuted} />
          <Text style={styles.guestAddressTitle}>Login to Save Addresses</Text>
          <Text style={styles.guestAddressMessage}>
            Login or register to save delivery addresses and make future checkouts faster
          </Text>
          <View style={styles.guestButtonsContainer}>
            <TouchableOpacity
              style={styles.guestLoginButton}
              onPress={() => navigation.navigate('Login', { fromCheckout: true })}
            >
              <Text style={styles.guestLoginText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.guestRegisterButton}
              onPress={() => navigation.navigate('Register', { fromCheckout: true })}
            >
              <Text style={styles.guestRegisterText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Saved Addresses */}
          {addresses.length > 0 ? (
        <View style={styles.addressList}>
          <Text style={styles.addressListTitle}>Saved Addresses</Text>
          {addresses.slice(0, 3).map((address) => (
            <TouchableOpacity
              key={address._id}
              style={[
                styles.addressCard,
                selectedAddress?._id === address._id && styles.addressCardSelected,
              ]}
              onPress={() => handleAddressSelect(address)}
            >
              <View style={styles.addressCardHeader}>
                <View style={styles.addressTypeContainer}>
                  <Ionicons
                    name={
                      address.addressType === 'home'
                        ? 'home'
                        : address.addressType === 'office'
                        ? 'business'
                        : 'location'
                    }
                    size={16}
                    color={selectedAddress?._id === address._id ? THEME.primary : THEME.textSecondary}
                  />
                  <Text
                    style={[
                      styles.addressTypeText,
                      selectedAddress?._id === address._id && styles.addressTypeTextSelected,
                    ]}
                  >
                    {address.title || address.addressType}
                  </Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <View style={[
                  styles.radioButton,
                  selectedAddress?._id === address._id && styles.radioButtonSelected,
                ]}>
                  {selectedAddress?._id === address._id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              
              <Text style={styles.addressText} numberOfLines={2}>
                {address.fullName}
              </Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                {address.landmark ? `, ${address.landmark}` : ''}
              </Text>
              <Text style={styles.addressText}>
                {address.area}, {address.city}, {address.state} - {address.pincode}
              </Text>
              <Text style={styles.phoneText}>
                📞 {address.phoneNumber}
              </Text>
            </TouchableOpacity>
          ))}
          
          {addresses.length > 3 && (
            <TouchableOpacity
              style={[styles.viewMoreButton, navigating && styles.disabledButton]}
              onPress={handleNavigateToAddresses}
              disabled={navigating}
            >
              <Text style={styles.viewMoreText}>
                View all {addresses.length} addresses
              </Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.primary} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.noAddressContainer}>
          <Ionicons name="location-outline" size={48} color={THEME.textMuted} />
          <Text style={styles.noAddressTitle}>No saved addresses</Text>
          <Text style={styles.noAddressMessage}>
            Add an address to make checkout faster
          </Text>
          <TouchableOpacity
            style={[styles.addFirstAddressButton, navigating && styles.disabledButton]}
            onPress={handleNavigateToAddAddress}
            disabled={navigating}
          >
            <Ionicons name="add" size={20} color={THEME.background} />
            <Text style={styles.addFirstAddressText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Address required message for logged in users */}
      {user && addresses.length === 0 && (
        <View style={styles.addressRequiredMessage}>
          <Ionicons name="information-circle-outline" size={20} color={THEME.warning} />
          <Text style={styles.addressRequiredText}>
            Please add an address to continue with checkout
          </Text>
        </View>
      )}
        </>
      )}
    </Card>
  );

  const renderPaymentSection = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="card-outline" size={24} color={THEME.primary} />
        <Text style={styles.sectionTitle}>Payment Method</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentMethod === 'cod' && styles.paymentOptionSelected,
        ]}
        onPress={() => setPaymentMethod('cod')}
      >
        <View style={styles.paymentOptionContent}>
          <Ionicons 
            name="cash-outline" 
            size={24} 
            color={paymentMethod === 'cod' ? THEME.primary : THEME.textMuted} 
          />
          <View style={styles.paymentOptionText}>
            <Text style={[
              styles.paymentOptionTitle,
              paymentMethod === 'cod' && styles.paymentOptionTitleSelected,
            ]}>
              Cash on Delivery (COD)
            </Text>
            <Text style={styles.paymentOptionDescription}>
              Pay when your order is delivered
            </Text>
          </View>
        </View>
        <View style={[
          styles.radioButton,
          paymentMethod === 'cod' && styles.radioButtonSelected,
        ]}>
          {paymentMethod === 'cod' && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentMethod === 'online' && styles.paymentOptionSelected,
        ]}
        onPress={() => setPaymentMethod('online')}
      >
        <View style={styles.paymentOptionContent}>
          <Ionicons 
            name="card-outline" 
            size={24} 
            color={paymentMethod === 'online' ? THEME.primary : THEME.textMuted} 
          />
          <View style={styles.paymentOptionText}>
            <Text style={[
              styles.paymentOptionTitle,
              paymentMethod === 'online' && styles.paymentOptionTitleSelected,
            ]}>
              Online Payment
            </Text>
            <Text style={styles.paymentOptionDescription}>
              Pay securely using UPI, Card, or Net Banking
            </Text>
          </View>
        </View>
        <View style={[
          styles.radioButton,
          paymentMethod === 'online' && styles.radioButtonSelected,
        ]}>
          {paymentMethod === 'online' && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );

  const renderOrderSummary = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="receipt-outline" size={24} color={THEME.primary} />
        <Text style={styles.sectionTitle}>Order Summary</Text>
      </View>

      {/* Cart Items */}
      <View style={styles.cartItems}>
        {cart.slice(0, 3).map((item, index) => (
          <View key={item._id} style={styles.cartItem}>
            <Text style={styles.cartItemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cartItemDetails}>
              {item.quantity} {item.unit}s × ₹{item.price}
            </Text>
          </View>
        ))}
        {cart.length > 3 && (
          <Text style={styles.moreItems}>
            +{cart.length - 3} more {cart.length - 3 === 1 ? 'item' : 'items'}
          </Text>
        )}
      </View>

      <View style={styles.divider} />
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal ({cart.length} items)</Text>
        <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
      </View>

      {/* Minimum Order Warning */}
      {!isMinimumOrderMet && (
        <View style={styles.minimumOrderWarning}>
          <Ionicons name="warning-outline" size={16} color={THEME.warning} />
          <View style={styles.minimumOrderText}>
            <Text style={styles.minimumOrderTitle}>Minimum Order Required</Text>
            <Text style={styles.minimumOrderMessage}>
              Add ₹{(minimumOrderValue - subtotal).toFixed(2)} more to meet minimum order of ₹{minimumOrderValue}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.summaryRow}>
        <View style={styles.summaryLabelContainer}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          {subtotal > 500 && (
            <Text style={styles.savingsText}>You saved ₹50!</Text>
          )}
        </View>
        <Text style={[
          styles.summaryValue,
          (finalPricing.deliveryCharges || 0) === 0 && styles.freePrice
        ]}>
          {(finalPricing.deliveryCharges || 0) === 0 ? 'FREE' : `₹${Math.round(finalPricing.deliveryCharges || 0).toLocaleString()}`}
        </Text>
      </View>

      {subtotal <= 500 && (
        <View style={styles.deliveryTip}>
          <Ionicons name="information-circle-outline" size={16} color={THEME.info} />
          <Text style={styles.deliveryTipText}>
            Add ₹{(500 - subtotal + 1).toFixed(0)} more for free delivery
          </Text>
        </View>
      )}

      {/* Tax Section */}
      {(finalPricing.tax || 0) > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>₹{Math.round(finalPricing.tax || 0).toLocaleString()}</Text>
        </View>
      )}

      {/* Platform Fee Section */}
      {(finalPricing.platformFee || 0) > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Platform Fee</Text>
          <Text style={styles.summaryValue}>₹{Math.round(finalPricing.platformFee || 0).toLocaleString()}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>₹{Math.round(finalPricing.totalAmount || 0).toLocaleString()}</Text>
      </View>
    </Card>
  );

  const renderNotesSection = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text-outline" size={24} color={THEME.primary} />
        <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
      </View>

      <Input
        placeholder="Add any special instructions for delivery..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />
    </Card>
  );

  
  return (
    <View style={styles.container}>
      <CustomHeader
        title="Checkout"
        subtitle={`${cart.length} items • ₹${Math.round(finalPricing.totalAmount || 0).toLocaleString()}`}
        showBack={true}
        showCart={false}
        showProfile={false}
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        accessible={true}
        accessibilityLabel="Checkout form"
        accessibilityRole="scrollbar"
      >
        {renderAddressSection()}
        {renderPaymentSection()}
        {renderOrderSummary()}
        {renderNotesSection()}
        
        {/* Bottom section with button */}
        <View style={styles.bottomSection} accessible={false}>
          <Button
            title={
              !isMinimumOrderMet 
                ? `Minimum Order: ₹${minimumOrderValue}` 
                : `Place Order (₹${Math.round(finalPricing.totalAmount || 0).toLocaleString()})`
            }
            onPress={handlePlaceOrder}
            loading={createOrderMutation.isPending}
            disabled={!isMinimumOrderMet || !selectedAddress}
            style={[
              styles.placeOrderButton,
              !isMinimumOrderMet && styles.disabledButton
            ]}
            accessibilityLabel={`Place order for ${Math.round(finalPricing.totalAmount || 0).toLocaleString()} rupees`}
            accessibilityRole="button"
            accessibilityHint="Double tap to place your order and proceed to payment"
          />
        </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SIZES.md,
  },
  section: {
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    backgroundColor: THEME.surface,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: THEME.text,
    marginLeft: SIZES.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  halfWidth: {
    flex: 1,
    marginRight: SIZES.md,
  },
  lastHalfWidth: {
    flex: 1,
    marginRight: 0,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.md,
    marginBottom: SIZES.md,
  },
  paymentOptionSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '10',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionText: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  paymentOptionTitleSelected: {
    color: THEME.primary,
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: THEME.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.primary,
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
  bottomSection: {
    marginTop: SIZES.lg,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.xl,
    padding: SIZES.lg,
    backgroundColor: THEME.surface,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.medium,
  },
  placeOrderButton: {
    minHeight: SIZES.buttonHeight,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
  },
  cartItems: {
    marginBottom: SIZES.md,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  cartItemName: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '500',
    flex: 1,
    marginRight: SIZES.md,
  },
  cartItemDetails: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  moreItems: {
    fontSize: 12,
    color: THEME.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
  summaryLabelContainer: {
    flex: 1,
  },
  savingsText: {
    fontSize: 12,
    color: THEME.success,
    fontWeight: '600',
    marginTop: 2,
  },
  deliveryTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.info + '15',
    padding: SIZES.sm,
    borderRadius: SIZES.sm,
    marginVertical: SIZES.sm,
  },
  deliveryTipText: {
    fontSize: 12,
    color: THEME.info,
    marginLeft: SIZES.xs,
    flex: 1,
  },
  minimumOrderWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.warning + '15',
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    marginVertical: SIZES.sm,
  },
  minimumOrderText: {
    marginLeft: SIZES.sm,
    flex: 1,
  },
  minimumOrderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.warning,
    marginBottom: SIZES.xs,
  },
  minimumOrderMessage: {
    fontSize: 12,
    color: THEME.warning,
    lineHeight: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  addAddressText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  addressList: {
    marginBottom: SIZES.lg,
  },
  addressListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    backgroundColor: THEME.surface,
  },
  addressCardSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '10',
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginLeft: SIZES.xs,
    textTransform: 'capitalize',
  },
  addressTypeTextSelected: {
    color: THEME.primary,
  },
  defaultBadge: {
    backgroundColor: THEME.success,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.sm,
    marginLeft: SIZES.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: THEME.background,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 2,
    lineHeight: 18,
  },
  phoneText: {
    fontSize: 12,
    color: THEME.primary,
    marginTop: SIZES.xs,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.md,
    borderStyle: 'dashed',
  },
  viewMoreText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
    marginRight: SIZES.xs,
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  noAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  noAddressMessage: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.lg,
  },
  addFirstAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
  },
  addFirstAddressText: {
    fontSize: 14,
    color: THEME.background,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  manualAddressForm: {
    marginTop: SIZES.lg,
  },
  formSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.border,
  },
  separatorText: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginHorizontal: SIZES.md,
    fontWeight: '600',
  },
  addressRequiredMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.warning + '15',
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    marginTop: SIZES.md,
  },
  addressRequiredText: {
    fontSize: 14,
    color: THEME.warning,
    marginLeft: SIZES.sm,
    flex: 1,
    fontWeight: '500',
  },
  guestAddressContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  guestAddressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  guestAddressMessage: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.lg,
    lineHeight: 20,
  },
  guestButtonsContainer: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  guestLoginButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    minWidth: 80,
  },
  guestLoginText: {
    fontSize: 14,
    color: THEME.background,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestRegisterButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    minWidth: 80,
  },
  guestRegisterText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CheckoutScreen;