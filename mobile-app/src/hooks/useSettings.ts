import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';

export interface AppSettings {
  taxRate: number;
  deliveryConfig: {
    type: 'fixed' | 'threshold' | 'distance' | 'weight';
    fixedCharge: number;
    freeDeliveryThreshold: number;
    chargeForBelowThreshold: number;
    perKmRate: number;
    baseDistance: number;
    perKgRate: number;
    freeWeightLimit: number;
  };
  priceDisplayMode: 'admin' | 'merchant' | 'lowest';
  stockValidationMode: 'admin' | 'merchant';
  autoReduceStockOnDelivery: boolean;
  platformFeeRate: number;
  minimumOrderValue: number;
  updatedAt: string;
  updatedBy?: string;
}

export const useSettings = () => {
  return useQuery<{ data: AppSettings }>({
    queryKey: ['app-settings'],
    queryFn: () => apiService.settings.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCalculatePricing = (items: any[], customerData?: any) => {
  return useQuery({
    queryKey: ['calculate-pricing', items, customerData],
    queryFn: () => apiService.settings.calculatePricing(items, customerData),
    enabled: items.length > 0,
  });
};