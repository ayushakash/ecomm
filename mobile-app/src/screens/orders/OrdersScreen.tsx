import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('orders');
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

  const filterKey = ORDER_FILTERS.find((f) => f.value === status)?.key;

  return (
    <Screen>
      <ScreenHeader title={t('list.title')} subtitle={t('list.subtitle')} back={false} icon="receipt-outline" />
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {ORDER_FILTERS.map((filter) => (
            <Chip
              key={filter.key}
              label={t(`filters.${filter.key}`)}
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
          title={t('list.errorTitle')}
          message={t('list.errorMessage')}
          actionLabel={t('retry')}
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
                title={t('list.emptyFiltered', { status: filterKey ? t(`filters.${filterKey}`) : '' })}
                message={t('list.emptyFilteredMessage')}
                actionLabel={t('list.showAll')}
                actionVariant="outline"
                onAction={() => setStatus(undefined)}
              />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title={t('list.emptyTitle')}
                message={t('list.emptyMessage')}
                actionLabel={t('list.browse')}
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
