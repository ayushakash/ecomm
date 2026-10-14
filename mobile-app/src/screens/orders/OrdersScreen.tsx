import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, EmptyState, Screen, ScreenHeader } from '../../components/ui';
import { useInfiniteOrders } from '../../hooks/queries';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, SCREEN_PADDING, spacing } from '../../theme';
import type { Order, OrderStatus } from '../../types/models';
import { OrderCard, OrderCardSkeleton } from './components/OrderCard';
import { ORDER_FILTERS } from './components/orderUtils';

/** Port of client/src/pages/orders/OrderHistory.js: paginated history with status filters. */
export default function OrdersScreen({ navigation }: MainTabScreenProps<'OrdersTab'>) {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const query = useInfiniteOrders({ status });
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const [refreshing, setRefreshing] = useState(false);

  // Web refetches on mount/window focus (staleTime 0); refetch whenever the tab regains focus.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) refetch();
      focusedOnce.current = true;
    }, [refetch]),
  );

  const orders = useMemo(() => data?.pages.flatMap((page) => page.orders ?? []) ?? [], [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const openOrder = useCallback(
    (order: Order) => navigation.navigate('OrderDetail', { orderId: order._id }),
    [navigation],
  );

  const filterLabel = ORDER_FILTERS.find((f) => f.value === status)?.label;

  return (
    <Screen>
      <ScreenHeader title="My Orders" subtitle="Track all your orders in one place" back={false} icon="receipt-outline" />
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {ORDER_FILTERS.map((filter) => (
            <Chip
              key={filter.label}
              label={filter.label}
              selected={filter.value === status}
              onPress={() => setStatus(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      {isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </View>
      ) : isError && orders.length === 0 ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your orders"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order) => order._id}
          renderItem={({ item }) => <OrderCard order={item} onPress={openOrder} />}
          contentContainerStyle={[styles.list, orders.length === 0 && styles.grow]}
          ItemSeparatorComponent={Separator}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
          ListEmptyComponent={
            status ? (
              <EmptyState
                icon="filter-outline"
                title={`No ${filterLabel?.toLowerCase()} orders`}
                message="Try another filter to see the rest of your orders."
                actionLabel="Show all orders"
                actionVariant="outline"
                onAction={() => setStatus(undefined)}
              />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No orders yet"
                message="Start shopping to see your orders here!"
                actionLabel="Browse Products"
                onAction={() => navigation.navigate('ProductsTab')}
              />
            )
          }
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  filtersWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filters: { gap: spacing.sm, paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.md, paddingTop: spacing.xs },
  list: { padding: SCREEN_PADDING, gap: spacing.md },
  grow: { flexGrow: 1 },
  separator: { height: spacing.md },
  footer: { paddingVertical: spacing.lg },
});
