import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </CartProvider>
        </AuthProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}
