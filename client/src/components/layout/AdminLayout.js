import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
  CogIcon,
  CalculatorIcon,
  PhotoIcon,
  BellAlertIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import ResponsiveDashboardLayout from './ResponsiveDashboardLayout';
import { whatsappChatAPI } from '../../services/api';
import EnglishOnly from '../../i18n/EnglishOnly';

const AdminLayout = () => {
  // Unread customer WhatsApp messages → green badge on "WhatsApp Chat".
  const { data: unread = 0 } = useQuery({
    queryKey: ['wa-chat-unread'],
    queryFn: whatsappChatAPI.unread,
    refetchInterval: 30000,
  });

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Merchants', href: '/admin/merchants', icon: BuildingStorefrontIcon },
    { name: 'Professionals', href: '/admin/professionals', icon: WrenchScrewdriverIcon },
    { name: 'Products', href: '/admin/products', icon: CubeIcon },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
    { name: 'WhatsApp Bills', href: '/admin/whatsapp-bills', icon: ChatBubbleLeftRightIcon },
    { name: 'WhatsApp Chat', href: '/admin/whatsapp-chat', icon: ChatBubbleOvalLeftEllipsisIcon, badge: unread },
    { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Earnings', href: '/admin/earnings', icon: CurrencyRupeeIcon },
    { name: 'Calculator Leads', href: '/admin/calculator-leads', icon: CalculatorIcon },
    { name: 'App Banners', href: '/admin/banners', icon: PhotoIcon },
    { name: 'Push Notifications', href: '/admin/notifications', icon: BellAlertIcon },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon },
  ];

  return (
    <EnglishOnly>
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
    </EnglishOnly>
  );
};

export default AdminLayout;
