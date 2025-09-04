import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
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
  const { logout, user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/merchant', icon: HomeIcon },
    { name: 'Products', href: '/merchant/products', icon: CubeIcon },
    { name: 'Orders', href: '/merchant/orders', icon: ShoppingCartIcon },
    { name: 'Profile', href: '/merchant/profile', icon: UserIcon },
    { name: 'Analytics', href: '/merchant/analytics', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Merchant Panel</h1>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900"
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 pl-64 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-white shadow flex items-center justify-between px-6 relative">
          <h2 className="text-lg font-semibold">Welcome, {user?.name || "Merchant"}</h2>
          
          {/* User Avatar Dropdown */}
          <div className="relative">
            <button 
  onClick={() => setDropdownOpen(!dropdownOpen)} 
  className="flex items-center focus:outline-none"
>
  <div className="h-10 w-10 rounded-full border bg-gray-200 flex items-center justify-center">
    <UserIcon className="h-6 w-6 text-gray-600" />
  </div>
</button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                <Link 
                  to="/merchant/profile" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  <UserIcon className="h-4 w-4 mr-2" /> Profile
                </Link>
                <button 
                  onClick={() => { logout(); setDropdownOpen(false); }} 
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
