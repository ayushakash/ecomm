import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLocation } from '../../contexts/LocationContext';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import LocationPermissionModal from '../location/LocationPermissionModal';

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { getCartCount } = useCart();
  const { showLocationModal, requestLocationPermission, skipLocationPermission } = useLocation();
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
        <Outlet />
      </main>

      {/* Footer */}
      <Footer cartCount={getCartCount()} />

      {/* Location Permission Modal (for guest users) */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={skipLocationPermission}
        onEnableLocation={requestLocationPermission}
        onSkip={skipLocationPermission}
      />
    </div>
  );
};

export default Layout;
