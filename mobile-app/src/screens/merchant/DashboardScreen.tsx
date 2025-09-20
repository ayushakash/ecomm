import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMerchantDashboard, useMerchantAnalytics } from '../../hooks/useMerchant';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatsCard from '../../components/merchant/StatsCard';
import CustomLoader from '../../components/ui/CustomLoader';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useMerchantDashboard();

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useMerchantAnalytics();

  const [refreshing, setRefreshing] = React.useState(false);

  const dashboard = dashboardData?.data || {};
  const analytics = analyticsData?.data || {};

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchAnalytics()]);
    setRefreshing(false);
  };

  const renderWelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <Text style={styles.welcomeText}>Welcome back,</Text>
      <Text style={styles.merchantName}>{user?.name}!</Text>
      <Text style={styles.welcomeSubtext}>
        Here's what's happening with your business today
      </Text>
    </View>
  );

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Quick Stats</Text>
      <View style={styles.statsGrid}>
        <StatsCard
          title="Total Orders"
          value={dashboard.totalOrders || 0}
          icon="receipt-outline"
          color={THEME.primary}
          onPress={() => navigation.navigate('Orders')}
        />
        
        <StatsCard
          title="Pending Orders"
          value={dashboard.pendingOrders || 0}
          icon="time-outline"
          color={THEME.warning}
          onPress={() => navigation.navigate('Orders', { status: 'pending' })}
        />
        
        <StatsCard
          title="Total Revenue"
          value={`₹${(analytics.totalRevenue || 0).toFixed(0)}`}
          icon="trending-up-outline"
          color={THEME.success}
          subtitle="This month"
        />
        
        <StatsCard
          title="Active Products"
          value={dashboard.activeProducts || 0}
          icon="cube-outline"
          color={THEME.info}
          onPress={() => navigation.navigate('Products')}
        />
      </View>
    </View>
  );

  const renderRecentOrders = () => (
    <Card style={styles.recentOrdersCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="receipt-outline" size={24} color={THEME.primary} />
          <Text style={styles.cardTitle}>Recent Orders</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {dashboard.recentOrders && dashboard.recentOrders.length > 0 ? (
        <View style={styles.ordersList}>
          {dashboard.recentOrders.slice(0, 3).map((order: any) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderItem}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
            >
              <View style={styles.orderInfo}>
                <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                <Text style={styles.orderCustomer}>{order.customerName}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(order.status) }
                  ]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
          <Text style={styles.emptyText}>No recent orders</Text>
          <Text style={styles.emptySubtext}>Orders will appear here once customers start ordering</Text>
        </View>
      )}
    </Card>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Card onPress={() => navigation.navigate('Products')} style={styles.actionCard}>
          <Ionicons name="cube-outline" size={32} color={THEME.primary} />
          <Text style={styles.actionText}>Manage Products</Text>
        </Card>
        
        <Card onPress={() => navigation.navigate('Orders')} style={styles.actionCard}>
          <Ionicons name="receipt-outline" size={32} color={THEME.primary} />
          <Text style={styles.actionText}>View Orders</Text>
        </Card>
        
        <Card onPress={() => navigation.navigate('Analytics')} style={styles.actionCard}>
          <Ionicons name="analytics-outline" size={32} color={THEME.primary} />
          <Text style={styles.actionText}>Analytics</Text>
        </Card>
        
        <Card onPress={() => navigation.navigate('Profile')} style={styles.actionCard}>
          <Ionicons name="person-outline" size={32} color={THEME.primary} />
          <Text style={styles.actionText}>Profile</Text>
        </Card>
      </View>
    </View>
  );

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

  if (dashboardLoading || analyticsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomLoader visible={true} message="Loading dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeSection()}
        {renderQuickStats()}
        {renderRecentOrders()}
        {renderQuickActions()}
      </ScrollView>
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
  welcomeSection: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
  },
  welcomeText: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  merchantName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    marginVertical: SIZES.xs,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: THEME.textSecondary,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.lg,
    paddingHorizontal: SIZES.lg,
  },
  statsContainer: {
    marginBottom: SIZES.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.lg,
  },
  recentOrdersCard: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
    padding: SIZES.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginLeft: SIZES.md,
  },
  viewAllText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
  },
  ordersList: {
    gap: SIZES.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  orderCustomer: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  orderDate: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.sm,
  },
  statusBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
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
    lineHeight: 20,
  },
  quickActionsContainer: {
    marginBottom: SIZES.xl,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.lg,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '4%',
    marginBottom: SIZES.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
});

export default DashboardScreen;