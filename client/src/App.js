import React, { useEffect, Suspense, lazy } from 'react';
import 'leaflet/dist/leaflet.css';
import InstallBanner from './components/ui/InstallBanner';
import { Routes, Route, Navigate, useLocation as useRouterLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import analytics from './services/analytics';

// Layout Components (not lazy — needed immediately)
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import MerchantLayout from './components/layout/MerchantLayout';

// Public Pages — lazy loaded
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const MerchantRegister = lazy(() => import('./pages/auth/MerchantRegister'));
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const ProductDetail = lazy(() => import('./pages/products/ProductDetail'));
const Cart = lazy(() => import('./pages/cart/Cart'));
const Checkout = lazy(() => import('./pages/cart/Checkout'));
const Contact = lazy(() => import('./pages/Contact'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Blog = lazy(() => import('./pages/Blog'));

// Protected Pages — lazy loaded
const Profile = lazy(() => import('./pages/profile/Profile'));
const Addresses = lazy(() => import('./pages/profile/Addresses'));
const OrderHistory = lazy(() => import('./pages/orders/OrderHistory'));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail'));
const OrderSuccess = lazy(() => import('./pages/orders/OrderSuccess'));

// Admin Pages — lazy loaded
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminMerchants = lazy(() => import('./pages/admin/Merchants'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminEarnings = lazy(() => import('./pages/admin/Earnings'));
const AdminCalculatorLeads = lazy(() => import('./pages/admin/CalculatorLeads'));

// Merchant Pages — lazy loaded
const MerchantDashboard = lazy(() => import('./pages/merchant/Dashboard'));
const MerchantProducts = lazy(() => import('./pages/merchant/Products'));
const MerchantOrders = lazy(() => import('./pages/merchant/Orders'));
const MerchantProfile = lazy(() => import('./pages/merchant/Profile'));
const MerchantAnalytics = lazy(() => import('./pages/merchant/Analytics'));
const MerchantPayouts = lazy(() => import('./pages/merchant/Payouts'));

// Full-page spinner for standalone routes (no layout wrapper)
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RoleRoute = ({ children, role }) => (
  <ProtectedRoute allowedRoles={[role]}>{children}</ProtectedRoute>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="earnings" element={<AdminEarnings />} />
          <Route path="merchants" element={<AdminMerchants />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="calculator-leads" element={<AdminCalculatorLeads />} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function ScrollToTop() {
  const location = useRouterLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function AppContent() {
  const location = useRouterLocation();

  useEffect(() => {
    analytics.initialize();
  }, []);

  useEffect(() => {
    analytics.trackPageView(location.pathname, document.title);
  }, [location]);

  return (
    <>
      <ScrollToTop />
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <AppContent />
            <InstallBanner />
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
