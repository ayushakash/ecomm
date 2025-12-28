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

const MerchantLayout = () => {
  const navigation = [
    { name: 'Dashboard', href: '/merchant', icon: HomeIcon },
    { name: 'Products', href: '/merchant/products', icon: CubeIcon },
    { name: 'Orders', href: '/merchant/orders', icon: ShoppingCartIcon },
    { name: 'Payouts', href: '/merchant/payouts', icon: CurrencyRupeeIcon },
    { name: 'Profile', href: '/merchant/profile', icon: UserIcon },
    { name: 'Analytics', href: '/merchant/analytics', icon: ChartBarIcon },
  ];

  return (
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
  );
};

export default MerchantLayout;
