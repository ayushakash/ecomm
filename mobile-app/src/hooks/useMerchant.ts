import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import Toast from 'react-native-toast-message';

export const useMerchantProfile = () => {
  return useQuery({
    queryKey: ['merchant-profile'],
    queryFn: () => apiService.merchant.getProfile(),
  });
};

export const useMerchantDashboard = () => {
  return useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: () => apiService.order.getMerchantDashboard(),
  });
};

export const useMerchantAnalytics = () => {
  return useQuery({
    queryKey: ['merchant-analytics'],
    queryFn: () => apiService.order.getMerchantAnalytics(),
  });
};

export const useMerchantProducts = (params?: any) => {
  return useQuery({
    queryKey: ['merchant-products', params],
    queryFn: () => apiService.product.getMerchantProducts(params),
  });
};

export const useMerchantOrders = (params?: any) => {
  return useQuery({
    queryKey: ['merchant-orders', params],
    queryFn: () => apiService.order.getOrders(params),
  });
};

export const useUpdateMerchantProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (profileData: any) => apiService.merchant.updateProfile(profileData),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update profile',
      });
    },
  });
};

export const useRespondToOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, itemId, action }: { orderId: string; itemId: string; action: string }) => 
      apiService.order.respondToOrder(orderId, itemId, action),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order response sent successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to respond to order',
      });
    },
  });
};

export const useUpdateOrderItemStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, itemId, status, note }: { 
      orderId: string; 
      itemId: string; 
      status: string; 
      note?: string 
    }) => apiService.order.updateOrderItemStatus(orderId, itemId, status, note),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order status updated successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update order status',
      });
    },
  });
};