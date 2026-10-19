import React from 'react';
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  CurrencyRupeeIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import ResponsiveDashboardLayout from './ResponsiveDashboardLayout';
import EnglishOnly from '../../i18n/EnglishOnly';
import { useAuth } from '../../contexts/AuthContext';

const MerchantLayout = () => {
  const { impersonating, stopImpersonating, user } = useAuth();
  const navigation = [
    { name: 'Dashboard', href: '/merchant', icon: HomeIcon },
    { name: 'Products', href: '/merchant/products', icon: CubeIcon },
    { name: 'Orders', href: '/merchant/orders', icon: ShoppingCartIcon },
    { name: 'Payouts', href: '/merchant/payouts', icon: CurrencyRupeeIcon },
    { name: 'Profile', href: '/merchant/profile', icon: UserIcon },
    { name: 'Analytics', href: '/merchant/analytics', icon: ChartBarIcon },
  ];

  return (
    <EnglishOnly>
      {impersonating && (
        <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <span>Admin acting as {user?.businessName || user?.name || 'merchant'}</span>
          <button onClick={stopImpersonating} className="rounded-full bg-white px-3 py-1 text-amber-700 hover:bg-amber-50">
            Back to admin
          </button>
        </div>
      )}
      <ResponsiveDashboardLayout
        navigation={navigation}
        title="Merchant Hub"
        subtitle="Business Dashboard"
        brandIcon="🏪"
        gradientFrom="from-indigo-900"
        gradientVia="via-blue-900"
        gradientTo="to-purple-900"
        textColor="text-blue-200"
        type="merchant"
      />
    </EnglishOnly>
  );
};

export default MerchantLayout;
