import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import LanguagePrompt from '../../i18n/LanguagePrompt';
import LanguageSync from '../../i18n/LanguageSync';
import { useTranslation } from 'react-i18next';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
  </div>
);
const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { getCartCount } = useCart();
  const { t } = useTranslation('layout');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'home', name: t('nav.home'), href: '/' },
    { id: 'products', name: t('nav.products'), href: '/products' },
    { id: 'calculator', name: t('nav.calculator'), href: '/calculator' },
    { id: 'blog', name: t('nav.blog'), href: '/blog' },
    { id: 'contact', name: t('nav.contact'), href: '/contact' },
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

      <LanguagePrompt />
      <LanguageSync />
    </div>
  );
};

export default Layout;
