import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// Layout Components
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import MerchantLayout from './components/layout/MerchantLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProductList from './pages/products/ProductList';
import ProductDetail from './pages/products/ProductDetail';
import Cart from './pages/cart/Cart';
import Checkout from './pages/cart/Checkout';

// Protected Pages
import Profile from './pages/profile/Profile';
import OrderHistory from './pages/orders/OrderHistory';
import OrderDetail from './pages/orders/OrderDetail';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminMerchants from './pages/admin/Merchants';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminAnalytics from './pages/admin/Analytics';

// Merchant Pages
import MerchantDashboard from './pages/merchant/Dashboard';
import MerchantProducts from './pages/merchant/Products';
import MerchantOrders from './pages/merchant/Orders';
import MerchantProfile from './pages/merchant/Profile';
import MerchantAnalytics from './pages/merchant/Analytics';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Role-based Route Component
const RoleRoute = ({ children, role }) => {
  return <ProtectedRoute allowedRoles={[role]}>{children}</ProtectedRoute>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
      </Route>

      {/* Customer Protected Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Profile />} />
        <Route path="orders" element={<OrderHistory />} />
        <Route path="orders/:id" element={<OrderDetail />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          // <RoleRoute role="admin">
            <AdminLayout />
          //  </RoleRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
  <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="merchants" element={<AdminMerchants />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
      </Route>

      {/* Merchant Routes */}
      <Route
        path="/merchant"
        element={
          <RoleRoute role="merchant">
            <MerchantLayout />
          </RoleRoute>
        }
      >
        <Route index element={<MerchantDashboard />} />
  <Route path="products" element={<MerchantProducts />} />
  <Route path="orders" element={<MerchantOrders />} />
  <Route path="profile" element={<MerchantProfile />} />
  <Route path="analytics" element={<MerchantAnalytics />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
