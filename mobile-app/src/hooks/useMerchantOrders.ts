import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

export const useMerchantOrders = () => {
  return useQuery({
    queryKey: ['merchant-orders'],
    queryFn: () => apiService.order.getOrders(),
  });
};

export const useUnassignedOrders = () => {
  return useQuery({
    queryKey: ['unassigned-orders'],
    queryFn: () => apiService.order.getUnassignedOrders(),
  });
};

export const useRespondToOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, itemId, action }: { orderId: string; itemId: string; action: 'accept' | 'reject' }) => {
      if (action === 'accept') {
        return apiService.order.assignItem(orderId, itemId);
      } else {
        return apiService.order.rejectItem(orderId, itemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
    },
  });
};

export const useUpdateOrderItemStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, itemId, status, note }: { orderId: string; itemId: string; status: string; note?: string }) => {
      return apiService.order.updateOrderItemStatus(orderId, itemId, status, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
    },
  });
};