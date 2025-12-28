import React from 'react';
import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import ResponsiveDashboardLayout from './ResponsiveDashboardLayout';

const AdminLayout = () => {
  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Merchants', href: '/admin/merchants', icon: BuildingStorefrontIcon },
    { name: 'Products', href: '/admin/products', icon: CubeIcon },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
    { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Earnings', href: '/admin/earnings', icon: CurrencyRupeeIcon },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon },
  ];

  return (
    <ResponsiveDashboardLayout
      navigation={navigation}
      title="Admin Control"
      subtitle="System Dashboard"
      brandIcon="🔥"
      gradientFrom="from-red-900"
      gradientVia="via-pink-900"
      gradientTo="to-purple-900"
      textColor="text-pink-200"
      type="admin"
    />
  );
};

export default AdminLayout;
