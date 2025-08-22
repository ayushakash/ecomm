import React from 'react';
import { Outlet } from 'react-router-dom';
import { 
  HomeIcon, 
  CubeIcon, 
  ShoppingCartIcon,
  UserIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const MerchantLayout = () => {
  const { logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/merchant', icon: HomeIcon },
    { name: 'Products', href: '/merchant/products', icon: CubeIcon },
    { name: 'Orders', href: '/merchant/orders', icon: ShoppingCartIcon },
    { name: 'Profile', href: '/merchant/profile', icon: UserIcon },
    { name: 'Analytics', href: '/merchant/analytics', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Merchant Panel</h1>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900"
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
