import { useCallback, useMemo, useState } from 'react';
import { useInfiniteProducts } from '../../../hooks/queries';
import type { Product, ProductQuery } from '../../../types/models';
import { sortProducts, type SortOption } from './productFilters';

/**
 * Infinite product grid state shared by Home, Categories and Search:
 * flattened + de-duplicated rows, client price sort, load-more and pull-to-refresh.
 */
export function useProductFeed(query: Omit<ProductQuery, 'page'>, sort: SortOption, enabled = true) {
  const result = useInfiniteProducts(query, { enabled });
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = result;
  const [refreshing, setRefreshing] = useState(false);

  const products = useMemo(() => {
    const seen = new Set<string>();
    const rows: Product[] = [];
    for (const page of data?.pages ?? []) {
      for (const product of page.products ?? []) {
        if (seen.has(product._id)) continue;
        seen.add(product._id);
        rows.push(product);
      }
    }
    return sortProducts(rows, sort);
  }, [data, sort]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** Pull-to-refresh; `extra` runs alongside (e.g. categories / merchants). */
  const refresh = useCallback(
    async (extra?: () => Promise<unknown>) => {
      setRefreshing(true);
      try {
        await Promise.all([enabled ? refetch() : null, extra?.()]);
      } finally {
        setRefreshing(false);
      }
    },
    [enabled, refetch],
  );

  return {
    products,
    totalProducts: data?.pages[0]?.totalProducts ?? 0,
    /** First load only (not background refetch / next page). */
    isLoading: enabled && result.isPending,
    isError: result.isError && products.length === 0,
    isFetchingNextPage,
    loadMore,
    refresh,
    refreshing,
    retry: refetch,
  };
}
