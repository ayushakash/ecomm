import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import { notificationService } from '../services/notificationService';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  sendOTP: (phone: string) => Promise<{ success: boolean; userExists: boolean; message?: string }>;
  loginWithOTP: (phone: string, otp: string) => Promise<AuthResponse>;
  registerWithOTP: (name: string, phone: string, otp: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<{ success: boolean }>;
  updateProfile: (profileData: any) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verify token is still valid
        try {
          const response = await apiService.auth.me();
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          await logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await apiService.auth.login(credentials);
      const { user: userData, accessToken, refreshToken: refreshTokenValue } = response.data;

      setUser(userData);
      setToken(accessToken);
      
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshTokenValue);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      notificationService.success('Welcome back!', 'Login successful!');

      return { success: true, user: userData, accessToken, refreshToken: refreshTokenValue };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      notificationService.error('Login Failed', message);
      return { success: false, message };
    }
  };

  const register = async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await apiService.auth.register(userData);
      const { user: newUser, accessToken, refreshToken: refreshTokenValue } = response.data;

      setUser(newUser);
      setToken(accessToken);

      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshTokenValue);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));

      notificationService.success('Welcome!', 'Registration successful!');

      return { success: true, user: newUser, accessToken, refreshToken: refreshTokenValue };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      notificationService.error('Registration Failed', message);
      return { success: false, message };
    }
  };

  const sendOTP = async (phone: string): Promise<{ success: boolean; userExists: boolean; message?: string }> => {
    try {
      const response = await apiService.auth.sendOTP({ phone });
      return {
        success: true,
        userExists: response.data.userExists,
        message: response.data.message
      };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      notificationService.error('OTP Failed', message);
      return { success: false, userExists: false, message };
    }
  };

  const loginWithOTP = async (phone: string, otp: string): Promise<AuthResponse> => {
    try {
      const response = await apiService.auth.verifyOTPLogin({ phone, otp });
      const { user: userData, accessToken, refreshToken: refreshTokenValue } = response.data;

      setUser(userData);
      setToken(accessToken);

      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshTokenValue);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      notificationService.success('Welcome back!', 'Login successful!');

      return { success: true, user: userData, accessToken, refreshToken: refreshTokenValue };
    } catch (error: any) {
      const message = error.response?.data?.message || 'OTP verification failed';
      notificationService.error('Login Failed', message);
      return { success: false, message };
    }
  };

  const registerWithOTP = async (name: string, phone: string, otp: string): Promise<AuthResponse> => {
    try {
      const response = await apiService.auth.verifyOTPRegister({ name, phone, otp });
      const { user: newUser, accessToken, refreshToken: refreshTokenValue } = response.data;

      setUser(newUser);
      setToken(accessToken);

      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshTokenValue);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));

      notificationService.success('Welcome!', 'Registration successful!');

      return { success: true, user: newUser, accessToken, refreshToken: refreshTokenValue };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      notificationService.error('Registration Failed', message);
      return { success: false, message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await apiService.auth.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    }
  };

  const refreshToken = async (): Promise<{ success: boolean }> => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        throw new Error('No refresh token');
      }

      const response = await apiService.auth.refresh(refreshTokenValue);
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      setToken(accessToken);
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', newRefreshToken);

      return { success: true };
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return { success: false };
    }
  };

  const updateProfile = async (profileData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiService.user.updateProfile(profileData);
      setUser(response.data.user);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      notificationService.success('Profile Updated', 'Your profile has been updated successfully!');
      
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed';
      notificationService.error('Update Failed', message);
      return { success: false, error: message };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    token,
    login,
    register,
    sendOTP,
    loginWithOTP,
    registerWithOTP,
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