import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

export const useMerchantOrders = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['merchant-orders'],
    queryFn: async () => {
      const response = await apiService.order.getOrders();
      return response.data; // Extract the data from axios response
    },
    enabled,
  });
};

export const useUnassignedOrders = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['unassigned-orders'],
    queryFn: async () => {
      const response = await apiService.order.getUnassignedOrders();
      return response.data; // Extract the data from axios response
    },
    enabled,
  });
};

export const useRespondToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, itemIds, action }: { orderId: string; itemIds: string[]; action: 'accept' | 'reject' }) => {
      if (action === 'accept') {
        // Use bulk assign if multiple items, otherwise single assign
        if (itemIds.length > 1) {
          return apiService.order.bulkAssignItems(orderId, itemIds);
        } else {
          return apiService.order.assignItem(orderId, itemIds[0]);
        }
      } else {
        // Reject single item (bulk reject not needed for MVP)
        return apiService.order.rejectItem(orderId, itemIds[0]);
      }
    },
    onMutate: async ({ orderId, itemIds, action }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['unassigned-orders'] });
      await queryClient.cancelQueries({ queryKey: ['merchant-orders'] });

      // Snapshot the previous values
      const previousUnassigned = queryClient.getQueryData(['unassigned-orders']);
      const previousMerchant = queryClient.getQueryData(['merchant-orders']);

      if (action === 'accept') {
        // Optimistically move items from unassigned to merchant orders
        queryClient.setQueryData(['unassigned-orders'], (old: any) => {
          if (!Array.isArray(old?.data || old)) return old;
          const ordersArray = Array.isArray(old) ? old : old?.data || [];

          return ordersArray.map((order: any) => {
            if (order._id === orderId) {
              return {
                ...order,
                items: order.items.filter((item: any) => !itemIds.includes(item._id))
              };
            }
            return order;
          }).filter((order: any) => order.items.length > 0);
        });

        // Add to merchant orders
        queryClient.setQueryData(['merchant-orders'], (old: any) => {
          if (!old) return { orders: [] };
          const currentOrders = Array.isArray(old) ? old : old?.orders || [];

          // Find the accepted items from unassigned orders
          const unassignedArray = Array.isArray(previousUnassigned) ? previousUnassigned : previousUnassigned?.data || [];
          const unassignedOrder = unassignedArray?.find((order: any) => order._id === orderId);
          const acceptedItems = unassignedOrder?.items?.filter((item: any) => itemIds.includes(item._id));

          if (!acceptedItems || acceptedItems.length === 0) return old;

          // Check if order already exists in merchant orders
          const existingOrderIndex = currentOrders.findIndex((order: any) => order._id === orderId);

          if (existingOrderIndex !== -1) {
            // Add items to existing order
            const updatedOrders = [...currentOrders];
            updatedOrders[existingOrderIndex] = {
              ...updatedOrders[existingOrderIndex],
              items: [...updatedOrders[existingOrderIndex].items, ...acceptedItems.map((item: any) => ({ ...item, itemStatus: 'assigned' }))]
            };
            return Array.isArray(old) ? updatedOrders : { ...old, orders: updatedOrders };
          } else {
            // Add new order with the accepted items
            const newOrder = {
              ...unassignedOrder,
              items: acceptedItems.map((item: any) => ({ ...item, itemStatus: 'assigned' }))
            };
            const newOrders = [newOrder, ...currentOrders];
            return Array.isArray(old) ? newOrders : { ...old, orders: newOrders };
          }
        });
      } else {
        // For reject, just remove the items from unassigned orders
        queryClient.setQueryData(['unassigned-orders'], (old: any) => {
          if (!Array.isArray(old?.data || old)) return old;
          const ordersArray = Array.isArray(old) ? old : old?.data || [];

          return ordersArray.map((order: any) => {
            if (order._id === orderId) {
              return {
                ...order,
                items: order.items.filter((item: any) => !itemIds.includes(item._id))
              };
            }
            return order;
          }).filter((order: any) => order.items.length > 0);
        });
      }

      return { previousUnassigned, previousMerchant };
    },
    onError: (err, variables, context: any) => {
      console.error('Failed to respond:', err);
      // Rollback optimistic updates on error
      if (context?.previousUnassigned) {
        queryClient.setQueryData(['unassigned-orders'], context.previousUnassigned);
      }
      if (context?.previousMerchant) {
        queryClient.setQueryData(['merchant-orders'], context.previousMerchant);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
    },
  });
};

export const useUpdateOrderItemStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, itemIds, status, note }: { orderId: string; itemIds: string[]; status: string; note?: string }) => {
      // Use bulk update if multiple items, otherwise single update
      if (itemIds.length > 1) {
        return apiService.order.bulkUpdateOrderItemsStatus(orderId, itemIds, status, note);
      } else {
        return apiService.order.updateOrderItemStatus(orderId, itemIds[0], status, note);
      }
    },
    onMutate: async ({ orderId, itemIds, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['merchant-orders'] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['merchant-orders']);

      // Optimistically update the cache
      queryClient.setQueryData(['merchant-orders'], (old: any) => {
        if (!old) return old;
        const currentOrders = Array.isArray(old) ? old : old?.orders || [];

        const updatedOrders = currentOrders.map((order: any) => {
          if (order._id === orderId) {
            return {
              ...order,
              items: order.items.map((item: any) => {
                if (itemIds.includes(item._id)) {
                  return { ...item, itemStatus: status };
                }
                return item;
              })
            };
          }
          return order;
        });

        return Array.isArray(old) ? updatedOrders : { ...old, orders: updatedOrders };
      });

      // Return context with the snapshot value
      return { previousOrders };
    },
    onError: (err, variables, context: any) => {
      console.error('Failed to update:', err);
      // Rollback optimistic update on error
      if (context?.previousOrders) {
        queryClient.setQueryData(['merchant-orders'], context.previousOrders);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
    },
  });
};