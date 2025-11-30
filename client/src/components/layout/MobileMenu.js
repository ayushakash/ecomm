import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

const MobileMenu = ({ open, setOpen, navigation, user, isAuthenticated }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="mobile-menu">
      <div className="mobile-menu-overlay" onClick={() => setOpen(false)} />
      <div className="mobile-menu-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Chardeevari</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Quick Links - Only About and Contact */}
          <nav className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">More</p>
            <div className="space-y-2">
              {/* About */}
              <Link
                to="/about"
                onClick={() => setOpen(false)}
                className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="h-5 w-5 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About Us
              </Link>
              {/* Contact */}
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="h-5 w-5 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Us
              </Link>
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 px-6 py-4">
            {isAuthenticated ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/profile/orders"
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full px-4 py-2 text-center text-base font-medium text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="block w-full px-4 py-2 text-center text-base font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
