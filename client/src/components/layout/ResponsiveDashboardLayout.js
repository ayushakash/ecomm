import React, { useState, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
  </div>
);
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const ResponsiveDashboardLayout = ({
  navigation,
  title,
  subtitle,
  brandIcon,
  gradientFrom,
  gradientTo,
  gradientVia,
  textColor,
  type = 'admin' // 'admin' or 'merchant'
}) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActiveRoute = (href) => {
    const basePath = type === 'admin' ? '/admin' : '/merchant';
    if (href === basePath && location.pathname === basePath) return true;
    if (href !== basePath && location.pathname.startsWith(href)) return true;
    return false;
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={closeSidebar} />

          {/* Mobile sidebar */}
          <div className="relative flex w-full max-w-xs flex-col bg-white">
            <div className={`flex h-full flex-col bg-gradient-to-b ${gradientFrom} ${gradientVia} ${gradientTo} shadow-xl`}>
              {/* Close button */}
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={closeSidebar}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              {/* Mobile Header */}
              <div className="flex h-16 flex-shrink-0 items-center justify-center border-b border-white/20 bg-white/10 backdrop-blur-sm px-4">
                <div className="text-center">
                  <h1 className="text-lg font-bold text-white flex items-center justify-center">
                    <span className="text-xl mr-2">{brandIcon}</span>
                    <span className="hidden sm:inline">{title}</span>
                  </h1>
                  <p className={`${textColor} text-xs mt-1 hidden sm:block`}>{subtitle}</p>
                </div>
              </div>

              {/* Mobile User Info */}
              <div className="p-3 mx-3 mt-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-sm">
                      {user?.name?.charAt(0).toUpperCase() || (type === 'admin' ? 'A' : 'M')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{user?.name || (type === 'admin' ? 'Admin' : 'Merchant')}</p>
                    <p className={`${textColor} text-xs truncate`}>{user?.email || `${type}@example.com`}</p>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="mt-6 px-3 flex-1">
                <div className="space-y-1">
                  {navigation.map((item, index) => {
                    const isActive = isActiveRoute(item.href);
                    return (
                      <div
                        key={item.name}
                        className="group"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Link
                          to={item.href}
                          onClick={closeSidebar}
                          className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                            isActive
                              ? 'bg-white/25 text-white shadow-xl backdrop-blur-sm border border-white/40 scale-105'
                              : `${textColor} hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm`
                          }`}
                        >
                          <div className={`mr-4 p-2 rounded-lg ${
                            isActive
                              ? 'bg-white/20 shadow-md'
                              : 'bg-white/10 group-hover:bg-white/20'
                          } transition-all duration-300`}>
                            <item.icon className={`h-5 w-5 ${
                              isActive ? 'text-white' : `${textColor.replace('text-', 'text-').replace('-200', '-300')}`
                            } group-hover:text-white transition-colors duration-300`} />
                          </div>
                          <div className="flex-1">
                            <span className="font-semibold tracking-wide">{item.name}</span>
                            {isActive && (
                              <div className="text-xs opacity-75 mt-0.5">Active</div>
                            )}
                          </div>
                          {isActive && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                              <div className="w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-150"></div>
                            </div>
                          )}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            →
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </nav>

              {/* Mobile Logout */}
              <div className="p-3 border-t border-white/20 bg-white/5">
                <button
                  onClick={() => {
                    logout();
                    closeSidebar();
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm font-semibold text-red-200 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                  <span>Logout</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    👋
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:bg-gradient-to-b ${gradientFrom} ${gradientVia} ${gradientTo} lg:shadow-2xl`}>
        {/* Desktop Header */}
        <div className="flex h-20 items-center justify-center border-b border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <span className="text-2xl mr-2">{brandIcon}</span>
              <span>{title}</span>
            </h1>
            <p className={`${textColor} text-sm mt-1`}>{subtitle}</p>
          </div>
        </div>

        {/* Desktop User Info Card */}
        <div className="p-4 mx-4 mt-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="flex items-center space-x-3">
            <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg`}>
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || (type === 'admin' ? 'A' : 'M')}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{user?.name || (type === 'admin' ? 'Admin' : 'Merchant')}</p>
              <p className={`${textColor} text-sm`}>{user?.email || `${type}@example.com`}</p>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="mt-8 px-4 flex-1">
          <div className="space-y-1">
            {navigation.map((item, index) => {
              const isActive = isActiveRoute(item.href);
              return (
                <div
                  key={item.name}
                  className="group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Link
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isActive
                        ? 'bg-white/25 text-white shadow-xl backdrop-blur-sm border border-white/40 scale-105'
                        : `${textColor} hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm`
                    }`}
                  >
                    <div className={`mr-4 p-2 rounded-lg ${
                      isActive
                        ? 'bg-white/20 shadow-md'
                        : 'bg-white/10 group-hover:bg-white/20'
                    } transition-all duration-300`}>
                      <item.icon className={`h-6 w-6 ${
                        isActive ? 'text-white' : `${textColor.replace('text-', 'text-').replace('-200', '-300')}`
                      } group-hover:text-white transition-colors duration-300`} />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold tracking-wide">{item.name}</span>
                      {isActive && (
                        <div className="text-xs opacity-75 mt-0.5">Active</div>
                      )}
                    </div>
                    {isActive && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-150"></div>
                      </div>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      →
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Desktop Bottom Section - Logout */}
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
            <p className={`text-xs ${textColor.replace('text-', 'text-').replace('-200', '-300')}/60`}>
              {type === 'admin' ? 'Admin Panel' : 'Merchant Hub'} v2.0 • Powered by Chardeevari
            </p>
          </div>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          <span className="mr-2">{brandIcon}</span>
          {title}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="min-h-screen">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveDashboardLayout;