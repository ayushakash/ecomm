import React, { useEffect, Suspense, lazy } from 'react';
import 'leaflet/dist/leaflet.css';
import { Routes, Route, Navigate, matchPath, useLocation as useRouterLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import GoogleOneTap from './components/GoogleOneTap';
import analytics from './services/analytics';
import { LANDING_CONFIGS } from './pages/landing/landingConfig';
import NotFound from './pages/NotFound';

// Layout Components (not lazy — needed immediately)
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import MerchantLayout from './components/layout/MerchantLayout';

/**
 * React.lazy page that can also be loaded ahead of render. index.js preloads the
 * page of the current URL before hydrating prerendered HTML, so hydration never
 * suspends (which would replace the prerendered page with a spinner).
 */
function lazyPage(factory) {
  const Lazy = lazy(factory);
  let Loaded = null;
  const Page = (props) => (Loaded ? <Loaded {...props} /> : <Lazy {...props} />);
  Page.preload = () => factory().then((module) => { Loaded = module.default; });
  return Page;
}

// Public Pages — lazy loaded
const Home = lazyPage(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const MerchantRegister = lazy(() => import('./pages/auth/MerchantRegister'));
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'));
const ProductList = lazyPage(() => import('./pages/products/ProductList'));
const ProductDetail = lazyPage(() => import('./pages/products/ProductDetail'));
const Cart = lazy(() => import('./pages/cart/Cart'));
const Checkout = lazy(() => import('./pages/cart/Checkout'));
const Contact = lazyPage(() => import('./pages/Contact'));
const DeleteAccount = lazyPage(() => import('./pages/DeleteAccount'));
const PrivacyPolicy = lazyPage(() => import('./pages/PrivacyPolicy'));
const Calculator = lazyPage(() => import('./pages/Calculator'));
const Blog = lazyPage(() => import('./pages/Blog'));
const BlogPost = lazyPage(() => import('./pages/BlogPost'));
const MaterialLanding = lazyPage(() => import('./pages/landing/MaterialLanding'));
const About = lazyPage(() => import('./pages/About'));
const AajKaRate = lazyPage(() => import('./pages/AajKaRate'));

// Prerendered (react-snap) public routes → page component, for preloadRoute().
// Unknown paths render NotFound, which is bundled eagerly.
const PRERENDERED_PAGES = [
  ['/', Home],
  ['/products', ProductList],
  ['/products/:id', ProductDetail],
  ['/contact', Contact],
  ['/delete-account', DeleteAccount],
  ['/privacy-policy', PrivacyPolicy],
  ['/calculator', Calculator],
  ['/blog', Blog],
  ['/blog/:slug', BlogPost],
  ['/about', About],
  ['/aaj-ka-rate', AajKaRate],
  ...Object.values(LANDING_CONFIGS).map((c) => [`/${c.slug}`, MaterialLanding]),
];

/** Load the page chunk for `pathname` (resolves immediately if none). */
export const preloadRoute = (pathname) => {
  const match = PRERENDERED_PAGES.find(([pattern]) => matchPath(pattern, pathname));
  return match ? match[1].preload() : Promise.resolve();
};

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
const AdminMerchantProducts = lazy(() => import('./pages/admin/MerchantProducts'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminEarnings = lazy(() => import('./pages/admin/Earnings'));
const AdminCalculatorLeads = lazy(() => import('./pages/admin/CalculatorLeads'));
const AdminAreaRequests = lazy(() => import('./pages/admin/AreaRequests'));
const AdminBanners = lazy(() => import('./pages/admin/Banners'));
const AdminProfessionals = lazy(() => import('./pages/admin/Professionals'));
const AdminWhatsAppBills = lazy(() => import('./pages/admin/WhatsAppBills'));
const AdminWhatsAppChat = lazy(() => import('./pages/admin/WhatsAppChat'));
const AdminCampaigns = lazy(() => import('./pages/admin/Campaigns'));

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
          <Route path="delete-account" element={<DeleteAccount />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="privacy" element={<Navigate to="/privacy-policy" replace />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="about" element={<About />} />
          <Route path="aaj-ka-rate" element={<AajKaRate />} />
          {/* SEO landing pages — high-intent Ranchi material searches (slugs from landingConfig.js) */}
          {Object.values(LANDING_CONFIGS).map((config) => (
            <Route key={config.slug} path={config.slug} element={<MaterialLanding config={config} />} />
          ))}
          {/* Unknown URLs: real "not found" page (noindex), never a redirect to home */}
          <Route path="*" element={<NotFound />} />
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
        <Route
          path="/admin"
          element={
            <RoleRoute role="admin">
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="earnings" element={<AdminEarnings />} />
          <Route path="merchants" element={<AdminMerchants />} />
          <Route path="merchants/:merchantId/products" element={<AdminMerchantProducts />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="calculator-leads" element={<AdminCalculatorLeads />} />
          <Route path="area-requests" element={<AdminAreaRequests />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="professionals" element={<AdminProfessionals />} />
          <Route path="whatsapp-bills" element={<AdminWhatsAppBills />} />
          <Route path="whatsapp-chat" element={<AdminWhatsAppChat />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="notifications" element={<Navigate to="/admin/campaigns?tab=push" replace />} />
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
      <GoogleOneTap />
      <AppRoutes />
    </>
  );
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
