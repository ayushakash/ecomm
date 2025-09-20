export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'merchant' | 'admin';
  isVerified: boolean;
  area?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'merchant';
  area?: string;
  address?: string;
  coordinates?: [number, number];
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: Category;
  images: string[];
  stock: number;
  totalStock?: number;
  sku: string;
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantProduct {
  _id: string;
  productId: Product;
  merchantId: string;
  price: number;
  stock: number;
  enabled: boolean;
  minOrder: number;
  maxOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
}

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  images: string[];
  stock: number;
  sku: string;
  weight: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  platformFee?: number;
  discount?: number;
  totalAmount: number;
  deliveryAddress: Address;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  estimatedDelivery?: string;
  lifecycle: OrderLifecycle[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  _id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  unit: string;
  images: string[];
  weight: number;
  merchantId?: string;
  merchantName?: string;
  status: string;
  assignedAt?: string;
  statusHistory: OrderItemStatus[];
}

export interface OrderItemStatus {
  status: string;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface OrderLifecycle {
  event: string;
  timestamp: string;
  details?: any;
}

export interface Address {
  _id: string;
  user: string;
  title: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  isDefault: boolean;
  addressType: 'home' | 'office' | 'other';
  deliveryInstructions?: string;
  isActive: boolean;
  fullAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  _id: string;
  userId: string;
  name: string;
  contact: {
    phone: string;
    email: string;
  };
  businessType: string;
  area: string;
  address: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    area: string;
  };
  activeStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessHours: {
    open: string;
    close: string;
    isOpen24: boolean;
  };
  documents: {
    gst?: string;
    fssai?: string;
    pan?: string;
  };
  rating: number;
  totalOrders: number;
  completedOrders: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newProducts: boolean;
  merchantUpdates: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalProducts?: number;
  activeProducts?: number;
  totalCustomers?: number;
  totalMerchants?: number;
}