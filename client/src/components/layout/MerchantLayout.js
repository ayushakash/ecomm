import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CubeIcon, 
  ShoppingCartIcon,
  UserIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const MerchantLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActiveRoute = (href) => {
    if (href === '/merchant' && location.pathname === '/merchant') return true;
    if (href !== '/merchant' && location.pathname.startsWith(href)) return true;
    return false;
  };

  const navigation = [
    { name: 'Dashboard', href: '/merchant', icon: HomeIcon },
    { name: 'Products', href: '/merchant/products', icon: CubeIcon },
    { name: 'Orders', href: '/merchant/orders', icon: ShoppingCartIcon },
    { name: 'Profile', href: '/merchant/profile', icon: UserIcon },
    { name: 'Analytics', href: '/merchant/analytics', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Enhanced Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-indigo-900 via-blue-900 to-purple-900 shadow-2xl">
        {/* Header */}
        <div className="flex h-20 items-center justify-center border-b border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white flex items-center">
              🏪 <span className="ml-2">Merchant Hub</span>
            </h1>
            <p className="text-blue-200 text-sm mt-1">Business Dashboard</p>
          </div>
        </div>
        
        {/* User Info Card */}
        <div className="p-4 mx-4 mt-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'M'}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{user?.name || 'Merchant'}</p>
              <p className="text-blue-200 text-sm">{user?.email || 'merchant@example.com'}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 px-4 flex-1">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30' 
                        : 'text-blue-200 hover:bg-white/10 hover:text-white hover:shadow-md'
                    }`}
                  >
                    <item.icon className={`mr-4 h-6 w-6 ${
                      isActive ? 'text-white' : 'text-blue-300'
                    }`} />
                    <span className="font-semibold">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Bottom Section - Logout */}
        <div className="p-4 border-t border-white/20 bg-white/5">
          <button 
            onClick={logout} 
            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-red-200 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 mr-4 group-hover:scale-110 transition-transform" />
            <span>Logout</span>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              👋
            </div>
          </button>
          
          {/* Version Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-blue-300/60">Version 2.0 • Powered by Chardeevari
            </p>
          </div>
        </div>
      </div>

      {/* Main content area - No navbar */}
      <div className="flex-1 pl-72">
        {/* Page Content - Full Screen */}
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
