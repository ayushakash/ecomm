import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const navigate = useNavigate();

  // Set up axios interceptor for token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/api/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user: userData, accessToken, refreshToken } = response.data;

      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      toast.success('Login successful!');
      
      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'merchant') {
        navigate('/merchant');
      } else {
        navigate('/');
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { user: newUser, accessToken, refreshToken } = response.data;

      setUser(newUser);
      setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      toast.success('Registration successful!');
      
      // Redirect merchants to pending approval page
      if (newUser.role === 'merchant') {
        navigate('/pending-approval');
      } else {
        navigate('/');
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
      navigate('/login');
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/api/auth/refresh', {
        refreshToken: refreshTokenValue,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      return { success: true };
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return { success: false };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/api/users/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const sendOTP = async (phone) => {
    try {
      const response = await api.post('/api/auth/send-otp', { phone });
      return { success: true, ...response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const loginWithOTP = async (phone, otp) => {
    try {
      const response = await api.post('/api/auth/verify-otp-login', { phone, otp });
      const { user: userData, accessToken, refreshToken: refreshTokenValue } = response.data;

      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshTokenValue);

      toast.success('Login successful!');

      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'merchant') {
        navigate('/merchant');
      } else {
        navigate('/');
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'OTP verification failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    token,
    setUser,
    login,
    register,
    sendOTP,
    loginWithOTP,
    logout,
    refreshToken,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isMerchant: user?.role === 'merchant',
    isCustomer: user?.role === 'customer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
