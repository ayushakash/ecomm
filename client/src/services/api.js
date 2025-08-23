import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/refresh`,
            { refreshToken }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const message = error.response?.data?.message || 'Something went wrong';
    
    // Don't show toast for 404 errors or validation errors
    if (error.response?.status !== 404 && error.response?.status !== 422) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  logout: () => api.post('/api/auth/logout'),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  me: () => api.get('/api/auth/me'),
};

export const userAPI = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (profileData) => api.put('/api/users/profile', profileData),
  getUsers: (params) => api.get('/api/users', { params }).then(res => res.data),
  updateUserStatus: (userId, status) => api.put(`/api/users/${userId}/status`, status),
  updateUserRole: (userId, role) => api.put(`/api/users/${userId}/role`, role),
  getAreas: () => api.get('/api/users/areas'),
};

export const merchantAPI = {
  onboard: (merchantData) => api.post('/api/merchants/onboard', merchantData),
  getMerchants: (params) => api.get('/api/merchants', { params }).then(res => res.data),
  getMerchantsByArea: (area) => api.get(`/api/merchants/area/${area}`),
  getMerchant: (id) => api.get(`/api/merchants/${id}`),
  updateMerchantStatus: (id, status) => api.put(`/api/merchants/${id}/status`, status),
  updateProfile: (profileData) => api.put('/api/merchants/profile', profileData),
  getProfile: () => api.get('/api/merchants/profile/me'),
};

export const productAPI = {
  getProducts: (params) => api.get('/api/products', { params }).then(res => res.data),
  getProduct: (id) => api.get(`/api/products/${id}`),
  createProduct: (productData) => api.post('/api/products', productData),
  updateProduct: (id, productData) => api.put(`/api/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/api/products/${id}`),
  updateStock: (id, stock) => api.put(`/api/products/${id}/stock`, { stock }),
  toggleProduct: (id, enabled) => api.put(`/api/products/${id}/enable`, { enabled }),
  getCategories: () => api.get('/api/products/categories'),
  getMerchantProducts: (params) => api.get('/api/products/merchant/my', { params }).then(res => res.data),
};

export const orderAPI = {
  createOrder: (orderData) => api.post('/api/orders', orderData),
  getOrders: (params) => api.get('/api/orders', { params }).then(res => res.data),
  getOrder: (id) => api.get(`/api/orders/${id}`),
  updateOrderStatus: (id, status, note) => api.put(`/api/orders/${id}/status`, { status, note }),
  assignOrder: (id, merchantId) => api.put(`/api/orders/${id}/assign`, { merchantId }),
  cancelOrder: (id) => api.put(`/api/orders/${id}/cancel`),
  getAnalytics: () => api.get('/api/orders/analytics/summary'),
  getMerchantDashboard: () => api.get('/api/orders/merchant/dashboard'),
};

export default api;
