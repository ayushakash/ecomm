import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';

export const useProducts = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  area?: string;
}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => apiService.product.getProducts(params),
  });
};

export const useProductById = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiService.product.getById(id),
    enabled: !!id,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.product.getCategories(),
  });
};