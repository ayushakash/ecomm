import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerOrders } from '../../hooks/useOrders';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomHeader from '../../components/navigation/CustomHeader';
import CustomLoader from '../../components/ui/CustomLoader';

interface OrdersScreenProps {
  navigation: any;
}

interface OrderItemType {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  platformFee?: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    _id: string;
    productId: {
      _id: string;
      name: string;
      images: string[];
    };
    productName: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    sku?: string;
  }>;
  deliveryAddress: {
    fullName: string;
    phoneNumber: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  assignedMerchant?: {
    name: string;
    phoneNumber: string;
  };
}

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const {
    data: ordersResponse,
    isLoading,
    refetch,
    error,
  } = useCustomerOrders();

  // Fix data structure - the API returns { orders: [...] }
  const orders: OrderItemType[] = ordersResponse?.data?.orders || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return THEME.warning;
      case 'processing':
        return THEME.info;
      case 'shipped':
        return THEME.secondary;
      case 'delivered':
        return THEME.success;
      case 'cancelled':
        return THEME.error;
      default:
        return THEME.textMuted;
    }
  };

  const renderOrderItem = ({ item: order }: { item: OrderItemType }) => {
    const isExpanded = expandedOrders.has(order._id);
    const statusColor = getStatusColor(order.orderStatus);
    
    return (
      <Card style={styles.orderCard}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <Text style={styles.orderDate}>
              Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.orderTotal}>
              Total: <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '20' }
          ]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
            </Text>
          </View>
        </View>

        {/* Toggle Button */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => toggleOrderExpansion(order._id)}
        >
          <Text style={styles.toggleButtonText}>
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Text>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={THEME.primary} 
          />
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Order Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items</Text>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemImageContainer}>
                    <Image
                      source={{ 
                        uri: item.productId?.images?.[0] || 'https://via.placeholder.com/64'
                      }}
                      style={styles.itemImage}
                      defaultSource={{ uri: 'https://via.placeholder.com/64' }}
                    />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemQuantity}>
                      {item.quantity} x ₹{item.unitPrice} per {item.unit}
                    </Text>
                    {item.sku && (
                      <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                    )}
                  </View>
                  <Text style={styles.itemTotal}>
                    ₹{(item.unitPrice * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pricing Breakdown */}
            <View style={styles.pricingSection}>
              <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
              <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Subtotal</Text>
                  <Text style={styles.pricingValue}>₹{order.subtotal}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Tax</Text>
                  <Text style={styles.pricingValue}>₹{order.tax}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Delivery Charge</Text>
                  <Text style={styles.pricingValue}>₹{order.deliveryCharge}</Text>
                </View>
                {order.platformFee && order.platformFee > 0 && (
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Platform Fee</Text>
                    <Text style={styles.pricingValue}>₹{order.platformFee}</Text>
                  </View>
                )}
                <View style={[styles.pricingRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
                </View>
              </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              {order.deliveryAddressId ? (
                <View style={styles.addressContainer}>
                  <View style={styles.receiverInfo}>
                    <Ionicons name="person-outline" size={16} color={THEME.primary} />
                    <Text style={styles.receiverName}>
                      {order.deliveryAddressId.fullName}
                    </Text>
                  </View>
                  <View style={styles.receiverInfo}>
                    <Ionicons name="call-outline" size={16} color={THEME.primary} />
                    <Text style={styles.receiverPhone}>
                      {order.deliveryAddressId.phoneNumber}
                    </Text>
                  </View>
                  <View style={styles.addressInfo}>
                    <Ionicons name="location-outline" size={16} color={THEME.primary} />
                    <Text style={styles.addressText}>
                      {order.deliveryAddressId.addressLine1}
                      {order.deliveryAddressId.addressLine2 ? `, ${order.deliveryAddressId.addressLine2}` : ''}
                      {order.deliveryAddressId.landmark ? `, ${order.deliveryAddressId.landmark}` : ''}
                      {'\n'}{order.deliveryAddressId.area}, {order.deliveryAddressId.city}, {order.deliveryAddressId.state} - {order.deliveryAddressId.pincode}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.addressContainer}>
                  <View style={styles.receiverInfo}>
                    <Ionicons name="person-outline" size={16} color={THEME.primary} />
                    <Text style={styles.receiverName}>
                      {order.customerName}
                    </Text>
                  </View>
                  <View style={styles.receiverInfo}>
                    <Ionicons name="call-outline" size={16} color={THEME.primary} />
                    <Text style={styles.receiverPhone}>
                      {order.customerPhone}
                    </Text>
                  </View>
                  <View style={styles.addressInfo}>
                    <Ionicons name="location-outline" size={16} color={THEME.primary} />
                    <Text style={styles.addressText}>
                      {order.customerAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Payment Info */}
            <View style={styles.paymentSection}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  Payment: <Text style={styles.paymentValue}>
                    {order.paymentMethod} ({order.paymentStatus})
                  </Text>
                </Text>
              </View>
            </View>

            {/* Order Actions */}
            <View style={styles.orderActions}>
              {['pending', 'processing'].includes(order.orderStatus) && (
                <Button
                  title="Cancel Order"
                  variant="outline"
                  size="small"
                  onPress={() => {/* TODO: Implement cancel order */}}
                  style={[styles.actionButton, styles.cancelButton]}
                  textStyle={{ color: THEME.error }}
                />
              )}
              {/* <Button
                title="View Details"
                variant="ghost"
                size="small"
                onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                style={styles.actionButton}
              /> */}
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={THEME.textMuted} />
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start shopping to see your orders here!
      </Text>
      <Button
        title="Browse Products"
        onPress={() => navigation.navigate('Products')}
        style={styles.shopButton}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="Order History"
          subtitle="Loading your orders..."
          showBack={false}
          showCart={true}
          showProfile={true}
          onHomePress={() => navigation.navigate('Home')}
          onCartPress={() => navigation.navigate('Cart')}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <CustomLoader visible={true} message="Loading your orders..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="Order History"
          subtitle="Failed to load orders"
          showBack={false}
          showCart={true}
          showProfile={true}
          onHomePress={() => navigation.navigate('Home')}
          onCartPress={() => navigation.navigate('Cart')}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={THEME.error} />
          <Text style={styles.errorTitle}>Error loading orders</Text>
          <Text style={styles.errorMessage}>
            Please check your internet connection and try again.
          </Text>
          <Button
            title="Retry"
            onPress={refetch}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Order History"
        subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'} found`}
        showBack={false}
        showCart={true}
        showProfile={true}
        onHomePress={() => navigation.navigate('Home')}
        onCartPress={() => navigation.navigate('Cart')}
        onProfilePress={() => navigation.navigate('Profile')}
      />
      
      {orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: Math.max(insets.bottom, SIZES.sm) + SIZES.tabBarHeight + SIZES.xl }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom, SIZES.sm) + SIZES.tabBarHeight + SIZES.xl }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  listContainer: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  orderCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  orderHeaderLeft: {
    flex: 1,
    marginRight: SIZES.md,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  orderDate: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  orderTotal: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  totalAmount: {
    fontWeight: '600',
    color: THEME.text,
  },
  statusBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.md,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: SIZES.sm,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.primary,
    marginRight: SIZES.xs,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: SIZES.md,
    marginTop: SIZES.sm,
  },
  itemsSection: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  itemImageContainer: {
    marginRight: SIZES.md,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemDetails: {
    flex: 1,
    marginRight: SIZES.md,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  itemQuantity: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  pricingSection: {
    marginBottom: SIZES.lg,
  },
  pricingContainer: {
    backgroundColor: THEME.surface,
    borderRadius: SIZES.md,
    padding: SIZES.md,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: SIZES.sm,
    marginTop: SIZES.xs,
  },
  pricingLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  pricingValue: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
  },
  paymentSection: {
    marginBottom: SIZES.lg,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  paymentValue: {
    fontWeight: '500',
    color: THEME.text,
    textTransform: 'capitalize',
  },
  addressSection: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  addressContainer: {
    marginTop: SIZES.sm,
  },
  receiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  receiverName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginLeft: SIZES.sm,
  },
  receiverPhone: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginLeft: SIZES.sm,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SIZES.xs,
  },
  addressText: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginLeft: SIZES.sm,
    flex: 1,
    lineHeight: 20,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.sm,
  },
  actionButton: {
    paddingHorizontal: SIZES.lg,
  },
  cancelButton: {
    borderColor: THEME.error,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.xl,
  },
  shopButton: {
    paddingHorizontal: SIZES.xl,
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
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.xl,
  },
  retryButton: {
    paddingHorizontal: SIZES.xl,
  },
});

export default OrdersScreen;