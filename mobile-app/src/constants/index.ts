export const API_BASE_URL = 'http://192.168.1.5:5000';

// Re-export theme for backward compatibility
export { THEME as COLORS, SIZES, SHADOWS } from '../theme';

export const USER_ROLES = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  ADMIN: 'admin',
} as const;

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const MERCHANT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;