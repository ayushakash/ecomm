import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomLoader from '../../components/ui/CustomLoader';
import { 
  useMerchantOrders, 
  useUnassignedOrders, 
  useRespondToOrder, 
  useUpdateOrderItemStatus 
} from '../../hooks/useMerchantOrders';

interface OrdersScreenProps {
  navigation: any;
}

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'my'>('new');

  // Fetch data
  const { data: myOrders, isLoading: isLoadingMy, error: errorMy, refetch: refetchMy } = useMerchantOrders();
  const { data: newOrders, isLoading: isLoadingNew, error: errorNew, refetch: refetchNew } = useUnassignedOrders();

  // Mutations
  const respondMutation = useRespondToOrder();
  const updateStatusMutation = useUpdateOrderItemStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: THEME.warning + '20', text: THEME.warning };
      case 'assigned':
      case 'processing':
        return { bg: THEME.info + '20', text: THEME.info };
      case 'shipped':
        return { bg: THEME.secondary + '20', text: THEME.secondary };
      case 'delivered':
        return { bg: THEME.success + '20', text: THEME.success };
      case 'cancelled':
      case 'declined':
        return { bg: THEME.error + '20', text: THEME.error };
      default:
        return { bg: THEME.textMuted + '20', text: THEME.textMuted };
    }
  };

  const hasMixedStatuses = (order: any) => {
    if (!order.items || order.items.length <= 1) return false;
    const statuses = [...new Set(order.items.map((item: any) => item.itemStatus))];
    return statuses.length > 1;
  };

  const handleRespondToOrder = (orderId: string, itemId: string, action: 'accept' | 'reject') => {
    Alert.alert(
      action === 'accept' ? 'Accept Order' : 'Reject Order',
      `Are you sure you want to ${action} this order item?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: () => {
            respondMutation.mutate({ orderId, itemId, action });
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (orderId: string, itemId: string, status: string, productName: string) => {
    const statusLabels: { [key: string]: string } = {
      processing: 'Start Processing',
      shipped: 'Mark as Shipped',
      delivered: 'Mark as Delivered',
      cancelled: 'Cancel Order',
    };

    Alert.alert(
      'Update Status',
      `${statusLabels[status]} for ${productName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: status === 'cancelled' ? 'destructive' : 'default',
          onPress: () => {
            updateStatusMutation.mutate({ orderId, itemId, status });
          },
        },
      ]
    );
  };

  const renderOrderItem = (order: any, isNew = false) => {
    const statusColors = getStatusColor(order.status);
    
    return (
      <Card key={order._id} style={styles.orderCard}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>
              #{order.orderNumber || order._id.slice(-6)}
            </Text>
            {!isNew && hasMixedStatuses(order) && (
              <View style={[styles.statusBadge, { backgroundColor: THEME.warning + '20' }]}>
                <Text style={[styles.statusText, { color: THEME.warning }]}>
                  Partial
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <Text style={styles.customerPhone}>{order.customerPhone}</Text>
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {order.items?.map((item: any) => {
            const itemStatusColors = getStatusColor(item.itemStatus);
            
            return (
              <View key={item._id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemDetails}>
                    Qty: {item.quantity} | ₹{item.totalPrice}
                  </Text>
                </View>
                
                <View style={styles.itemActions}>
                  <View style={[styles.statusBadge, { backgroundColor: itemStatusColors.bg }]}>
                    <Text style={[styles.statusText, { color: itemStatusColors.text }]}>
                      {item.itemStatus?.charAt(0).toUpperCase() + item.itemStatus?.slice(1)}
                    </Text>
                  </View>
                  
                  {/* Action buttons for new orders and unassigned items */}
                  {((isNew && item.itemStatus === 'pending') || 
                    (!isNew && !item.assignedMerchantId && item.itemStatus === 'pending')) && (
                    <View style={styles.actionButtons}>
                      <Button
                        title={isNew ? 'Accept' : 'Claim'}
                        onPress={() => handleRespondToOrder(order._id, item._id, 'accept')}
                        variant="primary"
                        style={styles.smallButton}
                        textStyle={styles.smallButtonText}
                      />
                      <Button
                        title="Reject"
                        onPress={() => handleRespondToOrder(order._id, item._id, 'reject')}
                        variant="outline"
                        style={[styles.smallButton, styles.rejectButton]}
                        textStyle={[styles.smallButtonText, { color: THEME.error }]}
                      />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Status Update Actions for My Orders */}
        {!isNew && (
          <View style={styles.statusActions}>
            {order.items
              ?.filter((item: any) => 
                item.assignedMerchantId && 
                item.itemStatus !== 'delivered' && 
                item.itemStatus !== 'cancelled'
              )
              .map((item: any) => (
                <View key={item._id} style={styles.statusActionGroup}>
                  <Text style={styles.statusActionLabel}>{item.productName}:</Text>
                  <View style={styles.statusActionButtons}>
                    {item.itemStatus === 'assigned' && (
                      <Button
                        title="Start Processing"
                        onPress={() => handleUpdateStatus(order._id, item._id, 'processing', item.productName)}
                        variant="primary"
                        style={styles.statusButton}
                        textStyle={styles.statusButtonText}
                      />
                    )}
                    
                    {item.itemStatus === 'processing' && (
                      <Button
                        title="Mark Shipped"
                        onPress={() => handleUpdateStatus(order._id, item._id, 'shipped', item.productName)}
                        variant="secondary"
                        style={styles.statusButton}
                        textStyle={styles.statusButtonText}
                      />
                    )}
                    
                    {(item.itemStatus === 'shipped' || item.itemStatus === 'processing') && (
                      <Button
                        title="Mark Delivered"
                        onPress={() => handleUpdateStatus(order._id, item._id, 'delivered', item.productName)}
                        variant="primary"
                        style={styles.statusButton}
                        textStyle={styles.statusButtonText}
                      />
                    )}
                    
                    {(item.itemStatus === 'assigned' || item.itemStatus === 'processing') && (
                      <Button
                        title="Cancel"
                        onPress={() => handleUpdateStatus(order._id, item._id, 'cancelled', item.productName)}
                        variant="outline"
                        style={[styles.statusButton, styles.cancelButton]}
                        textStyle={[styles.statusButtonText, { color: THEME.error }]}
                      />
                    )}
                  </View>
                </View>
              ))}
          </View>
        )}
      </Card>
    );
  };

  const renderContent = () => {
    if (activeTab === 'new') {
      if (isLoadingNew) {
        return <CustomLoader visible={true} message="Loading new orders..." />;
      }
      
      if (errorNew) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Error loading new orders</Text>
            <Button
              title="Retry"
              onPress={() => refetchNew()}
              variant="outline"
              style={styles.retryButton}
            />
          </View>
        );
      }
      
      if (!newOrders || newOrders.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No new orders available</Text>
          </View>
        );
      }
      
      return newOrders.map((order: any) => renderOrderItem(order, true));
    } else {
      if (isLoadingMy) {
        return <CustomLoader visible={true} message="Loading my orders..." />;
      }
      
      if (errorMy) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Error loading my orders</Text>
            <Button
              title="Retry"
              onPress={() => refetchMy()}
              variant="outline"
              style={styles.retryButton}
            />
          </View>
        );
      }
      
      if (!myOrders?.orders || myOrders.orders.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No assigned orders</Text>
          </View>
        );
      }
      
      return myOrders.orders.map((order: any) => renderOrderItem(order, false));
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'new') {
      refetchNew();
    } else {
      refetchMy();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            New Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === 'new' ? isLoadingNew : isLoadingMy}
            onRefresh={handleRefresh}
            colors={[THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
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
  backButton: {
    padding: SIZES.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  headerRight: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: THEME.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
  activeTabText: {
    color: THEME.primary,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  errorText: {
    fontSize: 16,
    color: THEME.error,
    marginBottom: SIZES.lg,
  },
  emptyText: {
    fontSize: 16,
    color: THEME.textMuted,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SIZES.md,
  },
  orderCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginRight: SIZES.sm,
  },
  orderDate: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  customerInfo: {
    marginBottom: SIZES.md,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.text,
  },
  customerPhone: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  itemsContainer: {
    marginBottom: SIZES.md,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.backgroundSecondary,
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.text,
  },
  itemDetails: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SIZES.xs,
  },
  smallButton: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    minHeight: 28,
  },
  smallButtonText: {
    fontSize: 12,
  },
  rejectButton: {
    borderColor: THEME.error,
  },
  statusActions: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: SIZES.md,
  },
  statusActionGroup: {
    marginBottom: SIZES.sm,
  },
  statusActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  statusActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  statusButton: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    minHeight: 28,
  },
  statusButtonText: {
    fontSize: 11,
  },
  cancelButton: {
    borderColor: THEME.error,
  },
});

export default OrdersScreen;