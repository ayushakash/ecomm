import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../constants';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('accessToken');
          console.log('API Request interceptor - Token:', token ? 'Present' : 'Missing');
          console.log('API Request URL:', config.url);
          console.log('API Request Method:', config.method);
          
          // Check if this is an auth endpoint that doesn't need a token
          const isAuthEndpoint = config.url?.includes('/auth/login') ||
                                 config.url?.includes('/auth/register') ||
                                 config.url?.includes('/auth/refresh') ||
                                 config.url?.includes('/auth/send-otp') ||
                                 config.url?.includes('/auth/verify-otp');
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Authorization header set');
          } else if (!isAuthEndpoint) {
            console.warn('No access token found for API request');
            delete config.headers.Authorization;
          }
          
          return config;
        } catch (error) {
          console.error('Error in request interceptor:', error);
          return Promise.reject(error);
        }
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(
                `${API_BASE_URL}/api/auth/refresh`,
                { refreshToken }
              );

              const { accessToken, refreshToken: newRefreshToken } = response.data;
              await AsyncStorage.setItem('accessToken', accessToken);
              await AsyncStorage.setItem('refreshToken', newRefreshToken);

              // Retry the original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh token failed, clear storage and redirect to login
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            // Note: Navigation should be handled by AuthContext
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        const message = error.response?.data?.message || 'Something went wrong';
        
        // Don't show toast for 404 errors or validation errors
        if (error.response?.status !== 404 && error.response?.status !== 422) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: message,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic API methods
  async get<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
    return this.api.get(url, { params });
  }

  async post<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.api.post(url, data);
  }

  async put<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.api.put(url, data);
  }

  async delete<T>(url: string): Promise<AxiosResponse<T>> {
    return this.api.delete(url);
  }

  // Auth API
  auth = {
    login: (credentials: any) => this.post('/api/auth/login', credentials),
    register: (userData: any) => this.post('/api/auth/register', userData),
    sendOTP: (data: { phone: string }) => this.post('/api/auth/send-otp', data),
    verifyOTPLogin: (data: { phone: string; otp: string }) => this.post('/api/auth/verify-otp-login', data),
    verifyOTPRegister: (data: { name: string; phone: string; otp: string }) => this.post('/api/auth/verify-otp-register', data),
    logout: () => this.post('/api/auth/logout'),
    refresh: (refreshToken: string) => this.post('/api/auth/refresh', { refreshToken }),
    me: () => this.get('/api/auth/me'),
  };

  // User API
  user = {
    getProfile: () => this.get('/api/users/profile'),
    updateProfile: (profileData: any) => this.put('/api/users/profile', profileData),
    getUsers: (params?: any) => this.get('/api/users', params),
    updateUserStatus: (userId: string, status: any) => this.put(`/api/users/${userId}/status`, status),
    updateUserRole: (userId: string, role: any) => this.put(`/api/users/${userId}/role`, role),
    getAreas: () => this.get('/api/users/areas'),
  };

  // Merchant API
  merchant = {
    onboard: (merchantData: any) => this.post('/api/merchants/onboard', merchantData),
    getMerchants: (params?: any) => this.get('/api/merchants', params),
    getMerchantsByArea: (area: string) => this.get(`/api/merchants/area/${area}`),
    getMerchant: (id: string) => this.get(`/api/merchants/${id}`),
    updateMerchantStatus: (id: string, status: any) => this.put(`/api/merchants/${id}/status`, status),
    updateProfile: (profileData: any) => this.put('/api/merchants/profile', profileData),
    getProfile: () => this.get('/api/merchants/profile/me'),
    getMerchantsByProduct: (productId: string) => this.get(`/api/merchants/product/${productId}`),
  };

  // Product API
  product = {
    getProducts: (params?: any) => this.get('/api/products', params),
    getMasterProducts: (params?: any) => this.get('/api/products/master-products', params),
    getProduct: (id: string) => this.get(`/api/products/${id}`),
    getById: (id: string) => this.get(`/api/products/${id}`),
    createProduct: (productData: any) => this.post('/api/products', productData),
    updateProduct: (id: string, productData: any) => this.put(`/api/products/${id}`, productData),
    deleteProduct: (id: string) => this.delete(`/api/products/${id}`),
    updateStock: (id: string, data: any) => this.put(`/api/products/${id}/stock`, data),
    toggleProduct: (id: string, enabled: boolean) => this.put(`/api/products/${id}/enable`, { enabled }),
    getCategories: () => this.get('/api/products/categories'),
    addCategories: (category: any) => this.post('/api/products/categories', category),
    getMerchantProducts: (params?: any) => this.get('/api/products/merchant/my', params),
  };

  // Order API
  order = {
    createOrder: (orderData: any) => this.post('/api/orders', orderData),
    getOrders: (params?: any) => this.get('/api/orders', params),
    getOrder: (id: string) => this.get(`/api/orders/${id}`),
    updateOrderStatus: (id: string, status: string, note?: string) => 
      this.put(`/api/orders/${id}/status`, { status, note }),
    updateOrderItemStatus: (orderId: string, itemId: string, status: string, note?: string) => 
      this.put(`/api/orders/${orderId}/items/${itemId}/status`, { status, note }),
    cancelOrder: (id: string) => this.put(`/api/orders/${id}/cancel`),
    getAnalytics: () => this.get('/api/orders/analytics/summary'),
    getAdminDashboard: () => this.get('/api/orders/admin/dashboard'),
    getMerchantDashboard: () => this.get('/api/orders/merchant/dashboard'),
    getMerchantAnalytics: () => this.get('/api/orders/merchant/analytics/summary'),
    assignItem: (orderId: string, itemId: string) =>
      this.put(`/api/orders/${orderId}/items/${itemId}/assign`),
    autoAssignItem: (orderId: string, itemId: string, merchantId: string) =>
      this.put(`/api/orders/${orderId}/assign-merchant`, { itemId, merchantId }),
    getUnassignedOrders: () => this.get('/api/orders/status/unassigned'),
    respondToOrder: (orderId: string, itemId: string, action: string) =>
      this.post('/api/orders/respond', { orderId, itemId, action }),
    rejectItem: (orderId: string, itemId: string) =>
      this.post(`/api/orders/${orderId}/items/${itemId}/reject`),
    getOrderLifecycle: (orderId: string) => this.get(`/api/orders/${orderId}/lifecycle`),
  };

  // Settings API
  settings = {
    getSettings: () => this.get('/api/settings'),
    updateSettings: (settings: any) => this.put('/api/settings', settings),
    calculatePricing: (items: any, customerData: any) => 
      this.post('/api/settings/calculate-pricing', { items, customerData }),
    getDeliveryPreview: () => this.get('/api/settings/delivery-preview'),
  };

  // Address API
  addresses = {
    getAllAddresses: () => this.get('/api/addresses').then(res => res.data),
    getAddress: (id: string) => this.get(`/api/addresses/${id}`),
    createAddress: (addressData: any) => this.post('/api/addresses', addressData),
    updateAddress: (id: string, addressData: any) => this.put(`/api/addresses/${id}`, addressData),
    deleteAddress: (id: string) => this.delete(`/api/addresses/${id}`),
    setDefaultAddress: (id: string) => this.put(`/api/addresses/${id}/default`),
    getDefaultAddress: () => this.get('/api/addresses/default/get'),
  };
}

export default new ApiService();