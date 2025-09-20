import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import Toast from 'react-native-toast-message';

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderData: any) => apiService.order.createOrder(orderData),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order placed successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to place order',
      });
    },
  });
};

export const useOrders = (params?: any) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => apiService.order.getOrders(params),
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiService.order.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const useOrderLifecycle = (orderId: string) => {
  return useQuery({
    queryKey: ['order-lifecycle', orderId],
    queryFn: () => apiService.order.getOrderLifecycle(orderId),
    enabled: !!orderId,
  });
};

export const useCustomerOrders = (params?: any) => {
  return useQuery({
    queryKey: ['customer-orders', params],
    queryFn: () => apiService.order.getOrders(params),
  });
};

export const useOrderById = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiService.order.getOrder(orderId),
    enabled: !!orderId,
  });
};