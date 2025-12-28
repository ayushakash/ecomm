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
  const { data: myOrders, isLoading: isLoadingMy, error: errorMy, refetch: refetchMy } = useMerchantOrders(activeTab === 'my');
  const { data: newOrders, isLoading: isLoadingNew, error: errorNew, refetch: refetchNew } = useUnassignedOrders(activeTab === 'new');

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

  const handleRespondToOrder = (orderId: string, itemIds: string | string[], action: 'accept' | 'reject') => {
    const itemIdArray = Array.isArray(itemIds) ? itemIds : [itemIds];
    respondMutation.mutate({ orderId, itemIds: itemIdArray, action });
  };

  const handleUpdateStatus = (orderId: string, itemIds: string | string[], status: string) => {
    const itemIdArray = Array.isArray(itemIds) ? itemIds : [itemIds];
    updateStatusMutation.mutate({ orderId, itemIds: itemIdArray, status });
  };

  const renderOrderItem = (order: any, isNew = false) => {
    return (
      <Card key={order._id} style={styles.orderCard}>
        {/* Header with gradient background */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.orderNumberContainer}>
              <Text style={styles.orderNumber}>
                #{order.orderNumber || order._id.slice(-6)}
              </Text>
            </View>
            {!isNew && order.items && hasMixedStatuses(order) && (
              <View style={styles.partialBadge}>
                <Text style={styles.partialBadgeText}>Partial</Text>
              </View>
            )}
          </View>
          <View style={styles.orderMeta}>
            <Text style={styles.orderDate}>
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.orderValue}>₹{order.totalAmount}</Text>
          </View>
        </View>

        {/* Customer Info with beautiful styling */}
        <View style={styles.customerSection}>
          <View style={styles.customerIcon}>
            <Ionicons name="person" size={16} color={THEME.primary} />
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={styles.customerPhone}>{order.customerPhone}</Text>
          </View>
        </View>

        {/* Address Section */}
        {(order.deliveryAddressId || order.customerAddress) && (
          <View style={styles.addressSection}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={16} color={THEME.primary} />
            </View>
            <View style={styles.addressDetails}>
              <Text style={styles.addressTitle}>Delivery Address</Text>
              {order.deliveryAddressId ? (
                <View>
                  <Text style={styles.addressText}>
                    {order.deliveryAddressId.addressLine1}
                    {order.deliveryAddressId.addressLine2 ? `, ${order.deliveryAddressId.addressLine2}` : ''}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.deliveryAddressId.city}, {order.deliveryAddressId.state} - {order.deliveryAddressId.pincode}
                  </Text>
                  {order.deliveryAddressId.landmark && (
                    <Text style={styles.addressLandmark}>Near: {order.deliveryAddressId.landmark}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.addressText}>{order.customerAddress}</Text>
              )}
            </View>
          </View>
        )}

        {/* Bulk action buttons for new orders */}
        {isNew && order.items?.some((item: any) => item.itemStatus === 'pending') && (
          <View style={styles.bulkActionsSection}>
            <TouchableOpacity
              style={styles.bulkAcceptButton}
              onPress={() => handleRespondToOrder(
                order._id,
                order.items.filter((item: any) => item.itemStatus === 'pending').map((item: any) => item._id),
                'accept'
              )}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.bulkAcceptButtonText}>
                Accept All {order.items.filter((item: any) => item.itemStatus === 'pending').length} Items
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bulk action buttons for my orders */}
        {!isNew && (order.orderStatus === 'assigned' || order.orderStatus === 'processing' || order.orderStatus === 'shipped') && (
          <View style={styles.bulkActionsSection}>
            {(() => {
              const status = order.orderStatus || 'assigned';
              const allItemIds = order.items.map((item: any) => item._id);

              if (status === 'assigned' || status === 'pending') {
                return (
                  <TouchableOpacity
                    style={[styles.bulkStatusButton, { backgroundColor: THEME.info }]}
                    onPress={() => handleUpdateStatus(order._id, allItemIds, 'processing')}
                    disabled={updateStatusMutation.isLoading}
                  >
                    <Ionicons name="play-circle" size={18} color="#fff" />
                    <Text style={styles.bulkStatusButtonText}>
                      Start Processing All ({order.items.length})
                    </Text>
                  </TouchableOpacity>
                );
              } else if (status === 'processing') {
                return (
                  <TouchableOpacity
                    style={[styles.bulkStatusButton, { backgroundColor: THEME.secondary }]}
                    onPress={() => handleUpdateStatus(order._id, allItemIds, 'shipped')}
                    disabled={updateStatusMutation.isLoading}
                  >
                    <Ionicons name="airplane" size={18} color="#fff" />
                    <Text style={styles.bulkStatusButtonText}>
                      Ship All Items ({order.items.length})
                    </Text>
                  </TouchableOpacity>
                );
              } else if (status === 'shipped') {
                return (
                  <TouchableOpacity
                    style={[styles.bulkStatusButton, { backgroundColor: THEME.success }]}
                    onPress={() => handleUpdateStatus(order._id, allItemIds, 'delivered')}
                    disabled={updateStatusMutation.isLoading}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                    <Text style={styles.bulkStatusButtonText}>
                      Deliver All Items ({order.items.length})
                    </Text>
                  </TouchableOpacity>
                );
              }
            })()}
          </View>
        )}

        {/* Items with enhanced design */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item: any) => {
            const itemStatusColors = getStatusColor(item.itemStatus || order.orderStatus);

            return (
              <View key={item._id} style={styles.modernItemCard}>
                <View style={styles.itemContent}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemMeta}>
                      Qty: {item.quantity} • ₹{item.totalPrice}
                    </Text>
                  </View>

                  <View style={styles.itemStatusContainer}>
                    <View style={[styles.modernStatusBadge, { backgroundColor: itemStatusColors.bg }]}>
                      <Text style={[styles.modernStatusText, { color: itemStatusColors.text }]}>
                        {(item.itemStatus || order.orderStatus)?.charAt(0).toUpperCase() + (item.itemStatus || order.orderStatus)?.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
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
      
      const ordersArray = Array.isArray(newOrders) ? newOrders : newOrders?.data || [];

      if (ordersArray.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No new orders available</Text>
          </View>
        );
      }

      return ordersArray.map((order: any) => renderOrderItem(order, true));
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
      const ordersArray = Array.isArray(myOrders) ? myOrders : myOrders?.orders || [];

      if (ordersArray.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No assigned orders</Text>
          </View>
        );
      }

      return ordersArray.map((order: any) => renderOrderItem(order, false));
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>Manage incoming and assigned orders</Text>
        </View>

        {/* Tabs moved to header */}
        <View style={styles.headerTabs}>
          <TouchableOpacity
            style={[styles.headerTab, activeTab === 'new' && styles.activeHeaderTab]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.headerTabText, activeTab === 'new' && styles.activeHeaderTabText]}>
              New Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerTab, activeTab === 'my' && styles.activeHeaderTab]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.headerTabText, activeTab === 'my' && styles.activeHeaderTabText]}>
              My Orders
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: THEME.background,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerContent: {
    marginBottom: SIZES.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  headerTabs: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  headerTab: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
    backgroundColor: THEME.backgroundSecondary,
  },
  activeHeaderTab: {
    backgroundColor: THEME.primary,
  },
  headerTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
  activeHeaderTabText: {
    color: THEME.background,
    fontWeight: '600',
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
  // Modern Order Card Styles
  orderCard: {
    marginBottom: SIZES.lg,
    padding: 0,
    borderRadius: SIZES.md,
    backgroundColor: THEME.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border + '30',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumberContainer: {
    backgroundColor: THEME.primary + '10',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    marginRight: SIZES.sm,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  partialBadge: {
    backgroundColor: THEME.warning + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.sm,
  },
  partialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.warning,
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  orderDate: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  orderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.success,
  },

  // Customer Section
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md,
  },
  customerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: THEME.textSecondary,
  },

  // Address Section
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: THEME.border + '20',
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  addressDetails: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
  addressLandmark: {
    fontSize: 12,
    color: THEME.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Items Section
  itemsSection: {
    padding: SIZES.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.sm,
  },
  modernItemCard: {
    backgroundColor: THEME.backgroundSecondary,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: THEME.border + '20',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  itemDetails: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  itemStatusContainer: {
    alignItems: 'flex-end',
  },
  modernStatusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 6,
    borderRadius: SIZES.sm,
  },
  modernStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Bulk Action Buttons
  bulkActionsSection: {
    padding: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: THEME.border + '20',
  },
  bulkAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.success,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    gap: 10,
    shadowColor: THEME.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bulkAcceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  bulkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bulkStatusButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default OrdersScreen;