import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { getCartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();


  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const userNavigation = [
    { name: 'Profile', href: '/profile' },
    { name: 'Orders', href: '/profile/orders' },
    { name: 'Logout', href: '#', onClick: () => {} },
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
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;
