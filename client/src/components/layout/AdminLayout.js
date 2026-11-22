import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
  CogIcon,
  CalculatorIcon,
  PhotoIcon,
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  MapPinIcon
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
    { name: 'Dashboard', shortName: 'Home', href: '/admin', icon: HomeIcon, group: 'Overview', mobileTab: true },
    { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon, group: 'Overview' },
    { name: 'Earnings', href: '/admin/earnings', icon: CurrencyRupeeIcon, group: 'Overview' },
    { name: 'Orders', href: '/admin/orders', icon: ClipboardDocumentListIcon, group: 'Operations', mobileTab: true },
    { name: 'Products', shortName: 'Stock', href: '/admin/products', icon: CubeIcon, group: 'Operations', mobileTab: true },
    { name: 'Merchants', href: '/admin/merchants', icon: BuildingStorefrontIcon, group: 'Operations' },
    { name: 'Professionals', shortName: 'Pros', href: '/admin/professionals', icon: WrenchScrewdriverIcon, group: 'Operations' },
    { name: 'Users', href: '/admin/users', icon: UsersIcon, group: 'Customers' },
    { name: 'WhatsApp Chat', shortName: 'Chat', href: '/admin/whatsapp-chat', icon: ChatBubbleOvalLeftEllipsisIcon, badge: unread, group: 'Customers', mobileTab: true },
    { name: 'WhatsApp Bills', shortName: 'WA Bills', href: '/admin/whatsapp-bills', icon: ChatBubbleLeftRightIcon, group: 'Customers' },
    { name: 'Calculator Leads', shortName: 'Leads', href: '/admin/calculator-leads', icon: CalculatorIcon, group: 'Customers' },
    { name: 'Area Requests', shortName: 'Areas', href: '/admin/area-requests', icon: MapPinIcon, group: 'Customers' },
    { name: 'Campaigns', href: '/admin/campaigns', icon: MegaphoneIcon, group: 'Marketing' },
    { name: 'App Banners', shortName: 'Banners', href: '/admin/banners', icon: PhotoIcon, group: 'Marketing' },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon, pinned: true },
  ];

  return (
    <EnglishOnly>
      <ResponsiveDashboardLayout
        navigation={navigation}
        title="Admin Control"
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
