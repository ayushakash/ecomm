import React from 'react';
import {
  HomeIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
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
    { name: 'Dashboard', shortName: 'Home', href: '/merchant', icon: HomeIcon, mobileTab: true },
    { name: 'Orders', href: '/merchant/orders', icon: ClipboardDocumentListIcon, mobileTab: true },
    { name: 'Products', shortName: 'Stock', href: '/merchant/products', icon: CubeIcon, mobileTab: true },
    { name: 'Payouts', href: '/merchant/payouts', icon: CurrencyRupeeIcon, mobileTab: true },
    { name: 'Analytics', href: '/merchant/analytics', icon: ChartBarIcon },
    { name: 'Profile', href: '/merchant/profile', icon: UserIcon },
  ];

  return (
    <EnglishOnly>
      {impersonating && (
        <div className="fixed bottom-20 lg:bottom-4 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <span>Admin acting as {user?.businessName || user?.name || 'merchant'}</span>
          <button onClick={stopImpersonating} className="rounded-full bg-white px-3 py-1 text-amber-700 hover:bg-amber-50">
            Back to admin
          </button>
        </div>
      )}
      <ResponsiveDashboardLayout
        navigation={navigation}
        title="Merchant Hub"
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
