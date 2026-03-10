import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
  </div>
);
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { getCartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Calculator', href: '/calculator' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <MobileMenu
        open={mobileMenuOpen}
        setOpen={setMobileMenuOpen}
        navigation={navigation}
        user={user}
        isAuthenticated={isAuthenticated}
      />

      {/* Header */}
      <Header
        navigation={navigation}
        user={user}
        isAuthenticated={isAuthenticated}
        cartCount={getCartCount()}
        onMobileMenuToggle={() => setMobileMenuOpen(true)}
      />

      {/* Main content */}
      <main className="flex-1 pb-16 md:pb-0">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      <Footer cartCount={getCartCount()} />

    </div>
  );
};

export default Layout;
