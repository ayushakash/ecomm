import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation as useRouterLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import analytics from './services/analytics';

// Layout Components
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import MerchantLayout from './components/layout/MerchantLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MerchantRegister from './pages/auth/MerchantRegister';
import PendingApproval from './pages/auth/PendingApproval';
import ProductList from './pages/products/ProductList';
import ProductDetail from './pages/products/ProductDetail';
import Cart from './pages/cart/Cart';
import Checkout from './pages/cart/Checkout';
import Contact from './pages/Contact';
import Calculator from './pages/Calculator';
import Blog from './pages/Blog';

// Protected Pages
import Profile from './pages/profile/Profile';
import Addresses from './pages/profile/Addresses';
import OrderHistory from './pages/orders/OrderHistory';
import OrderDetail from './pages/orders/OrderDetail';
import OrderSuccess from './pages/orders/OrderSuccess';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminMerchants from './pages/admin/Merchants';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';
import AdminEarnings from './pages/admin/Earnings';

// Merchant Pages
import MerchantDashboard from './pages/merchant/Dashboard';
import MerchantProducts from './pages/merchant/Products';
import MerchantOrders from './pages/merchant/Orders';
import MerchantProfile from './pages/merchant/Profile';
import MerchantAnalytics from './pages/merchant/Analytics';
import MerchantPayouts from './pages/merchant/Payouts';

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
        <Route path="merchant-register" element={<MerchantRegister />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-success" element={<OrderSuccess />} />
        <Route path="contact" element={<Contact />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="blog" element={<Blog />} />
      </Route>

      {/* Auth-related Routes (outside main layout) */}
      <Route path="/pending-approval" element={<PendingApproval />} />

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
        <Route path="addresses" element={<Addresses />} />
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
        <Route path="earnings" element={<AdminEarnings />} />
        <Route path="merchants" element={<AdminMerchants />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="settings" element={<AdminSettings />} />
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
  <Route path="payouts" element={<MerchantPayouts />} />
  <Route path="profile" element={<MerchantProfile />} />
  <Route path="analytics" element={<MerchantAnalytics />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Wrapper component to track analytics
function AppContent() {
  const location = useRouterLocation();

  // Initialize analytics on app load
  useEffect(() => {
    analytics.initialize();
  }, []);

  // Track page views on route change
  useEffect(() => {
    analytics.trackPageView(location.pathname, document.title);
  }, [location]);

  return <AppRoutes />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <HelmetProvider>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </HelmetProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
