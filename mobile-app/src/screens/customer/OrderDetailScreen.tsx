import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOrderById } from '../../hooks/useOrders';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomLoader from '../../components/ui/CustomLoader';

interface OrderDetailScreenProps {
  navigation: any;
  route: { params: { orderId: string } };
}

interface OrderLifecycleItem {
  status: string;
  timestamp: string;
  message?: string;
}

interface OrderDetailType {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    productId: {
      _id: string;
      name: string;
      images: string[];
      price: number;
    };
    quantity: number;
    price: number;
    unit: string;
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
    _id: string;
    name: string;
    phoneNumber: string;
    address: string;
  };
  lifecycle?: OrderLifecycleItem[];
}

const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: orderResponse,
    isLoading,
    error,
    refetch,
  } = useOrderById(orderId);

  const order: OrderDetailType = orderResponse?.data;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return THEME.warning;
      case 'confirmed':
        return THEME.info;
      case 'processing':
        return THEME.primary;
      case 'ready':
        return THEME.success;
      case 'delivered':
        return THEME.success;
      case 'cancelled':
        return THEME.error;
      default:
        return THEME.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'processing':
        return 'sync-outline';
      case 'ready':
        return 'cube-outline';
      case 'delivered':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-outline';
    }
  };

  const handleCall = (phoneNumber: string, name: string) => {
    Alert.alert(
      `Call ${name}`,
      `Do you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL(`tel:${phoneNumber}`)
        },
      ]
    );
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement order cancellation
            console.log('Cancel order:', orderId);
          }
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={THEME.text} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Order Details</Text>
        <Text style={styles.orderNumber}>#{order?.orderNumber}</Text>
      </View>
    </View>
  );

  const renderStatusCard = () => (
    <Card style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={styles.statusIconContainer}>
          <Ionicons
            name={getStatusIcon(order.status)}
            size={32}
            color={getStatusColor(order.status)}
          />
        </View>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>Order Status</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(order.status) }]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
          <Text style={styles.statusDate}>
            Last updated: {new Date(order.updatedAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      {order.assignedMerchant && (
        <View style={styles.merchantSection}>
          <View style={styles.merchantInfo}>
            <Ionicons name="storefront" size={20} color={THEME.primary} />
            <View style={styles.merchantDetails}>
              <Text style={styles.merchantName}>{order.assignedMerchant.name}</Text>
              <Text style={styles.merchantAddress}>{order.assignedMerchant.address}</Text>
            </View>
            <TouchableOpacity
              style={styles.callMerchantButton}
              onPress={() => handleCall(order.assignedMerchant.phoneNumber, order.assignedMerchant.name)}
            >
              <Ionicons name="call" size={20} color={THEME.background} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );

  const renderOrderItems = () => (
    <Card style={styles.itemsCard}>
      <Text style={styles.cardTitle}>Order Items</Text>
      {order.items.map((item, index) => (
        <View key={index} style={styles.orderItem}>
          <View style={styles.itemImageContainer}>
            {item.productId.images && item.productId.images.length > 0 ? (
              <Image
                source={{ uri: item.productId.images[0] }}
                style={styles.itemImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={32} color={THEME.textMuted} />
              </View>
            )}
          </View>
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.productId.name}</Text>
            <Text style={styles.itemQuantity}>
              {item.quantity} {item.unit}{item.quantity > 1 ? 's' : ''}
            </Text>
            <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} per {item.unit}</Text>
          </View>
          
          <Text style={styles.itemTotal}>
            ₹{(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
      ))}
      
      <View style={styles.orderSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>
            ₹{(order.totalAmount - order.deliveryFee).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>
            {order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'Free'}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{order.totalAmount.toFixed(2)}</Text>
        </View>
      </View>
    </Card>
  );

  const renderDeliveryInfo = () => (
    <Card style={styles.deliveryCard}>
      <Text style={styles.cardTitle}>Delivery Information</Text>
      
      <View style={styles.addressSection}>
        <View style={styles.addressHeader}>
          <Ionicons name="location" size={20} color={THEME.primary} />
          <Text style={styles.addressTitle}>Delivery Address</Text>
        </View>
        <Text style={styles.customerName}>{order.deliveryAddress.fullName}</Text>
        <Text style={styles.customerPhone}>{order.deliveryAddress.phoneNumber}</Text>
        <Text style={styles.address}>
          {order.deliveryAddress.address}
          {order.deliveryAddress.landmark && `, ${order.deliveryAddress.landmark}`}
        </Text>
        <Text style={styles.address}>
          {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
        </Text>
      </View>

      <View style={styles.paymentSection}>
        <View style={styles.paymentHeader}>
          <Ionicons
            name={order.paymentMethod === 'cod' ? 'cash-outline' : 'card-outline'}
            size={20}
            color={THEME.primary}
          />
          <Text style={styles.paymentTitle}>Payment Method</Text>
        </View>
        <Text style={styles.paymentMethod}>
          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
        </Text>
      </View>

      {order.notes && (
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Ionicons name="document-text-outline" size={20} color={THEME.primary} />
            <Text style={styles.notesTitle}>Special Instructions</Text>
          </View>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}
    </Card>
  );

  const renderOrderLifecycle = () => {
    if (!order.lifecycle || order.lifecycle.length === 0) return null;

    return (
      <Card style={styles.lifecycleCard}>
        <Text style={styles.cardTitle}>Order Timeline</Text>
        {order.lifecycle
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map((event, index) => (
            <View key={index} style={styles.lifecycleItem}>
              <View style={styles.lifecycleIndicator}>
                <View style={[
                  styles.lifecycleDot,
                  { backgroundColor: getStatusColor(event.status) }
                ]} />
                {index < order.lifecycle.length - 1 && (
                  <View style={styles.lifecycleLine} />
                )}
              </View>
              <View style={styles.lifecycleContent}>
                <Text style={styles.lifecycleStatus}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Text>
                {event.message && (
                  <Text style={styles.lifecycleMessage}>{event.message}</Text>
                )}
                <Text style={styles.lifecycleTime}>
                  {new Date(event.timestamp).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
      </Card>
    );
  };

  const renderActionButtons = () => {
    const canCancel = ['pending', 'confirmed'].includes(order.status);
    const isDelivered = order.status === 'delivered';

    if (!canCancel && !isDelivered) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        {canCancel && (
          <Button
            title="Cancel Order"
            variant="outline"
            onPress={handleCancelOrder}
            style={[styles.actionButton, { borderColor: THEME.error }]}
          />
        )}
        {isDelivered && (
          <Button
            title="Reorder"
            variant="primary"
            onPress={() => {
              // TODO: Implement reorder functionality
              console.log('Reorder items:', order.items);
            }}
            style={styles.actionButton}
          />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <CustomLoader visible={true} message="Loading order details..." />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={THEME.error} />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorMessage}>
            The order you're looking for doesn't exist or has been removed.
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
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStatusCard()}
        {renderOrderItems()}
        {renderDeliveryInfo()}
        {renderOrderLifecycle()}
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: {
    padding: SIZES.sm,
  },
  headerContent: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  orderNumber: {
    fontSize: 16,
    color: THEME.textSecondary,
    marginTop: SIZES.xs,
  },
  statusCard: {
    margin: SIZES.lg,
    padding: SIZES.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  statusIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.lg,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  statusDate: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  merchantSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: SIZES.md,
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantDetails: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  merchantAddress: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  callMerchantButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsCard: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.lg,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: SIZES.md,
    overflow: 'hidden',
    marginRight: SIZES.md,
  },
  itemImage: {
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
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  itemQuantity: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  itemPrice: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  orderSummary: {
    borderTopWidth: 2,
    borderTopColor: THEME.border,
    paddingTop: SIZES.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  summaryLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: SIZES.md,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  deliveryCard: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  addressSection: {
    marginBottom: SIZES.xl,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginLeft: SIZES.sm,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  customerPhone: {
    fontSize: 14,
    color: THEME.primary,
    marginBottom: SIZES.md,
  },
  address: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.xs,
  },
  paymentSection: {
    marginBottom: SIZES.xl,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginLeft: SIZES.sm,
  },
  paymentMethod: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  notesSection: {
    marginBottom: 0,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginLeft: SIZES.sm,
  },
  notesText: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  lifecycleCard: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  lifecycleItem: {
    flexDirection: 'row',
    marginBottom: SIZES.lg,
  },
  lifecycleIndicator: {
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  lifecycleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  lifecycleLine: {
    width: 2,
    flex: 1,
    backgroundColor: THEME.borderLight,
    marginTop: SIZES.sm,
  },
  lifecycleContent: {
    flex: 1,
  },
  lifecycleStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  lifecycleMessage: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  lifecycleTime: {
    fontSize: 12,
    color: THEME.textMuted,
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
  actionButton: {
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
    textAlign: 'center',
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

export default OrderDetailScreen;