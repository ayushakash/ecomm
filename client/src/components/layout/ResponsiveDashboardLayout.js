import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowLeftOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
  </div>
);

/** Full class strings per layout type so Tailwind can see them. */
const ACCENTS = {
  admin: { tab: 'text-rose-700', tile: 'bg-rose-50 text-rose-700', avatar: 'bg-rose-100 text-rose-700' },
  merchant: { tab: 'text-indigo-700', tile: 'bg-indigo-50 text-indigo-700', avatar: 'bg-indigo-100 text-indigo-700' },
};

const badgeText = (count) => (count > 99 ? '99+' : count);

/** Splits nav items into consecutive sections by their `group` label. */
const groupItems = (items) =>
  items.reduce((sections, item) => {
    const last = sections[sections.length - 1];
    if (last && last.label === item.group) last.items.push(item);
    else sections.push({ label: item.group, items: [item] });
    return sections;
  }, []);

/**
 * Dashboard shell: fixed gradient sidebar on desktop; top bar + bottom tab bar
 * (items with `mobileTab`) and a "More" sheet (everything else) on mobile.
 * Items with `pinned` sit in the sidebar's bottom row instead of the scrolling nav.
 */
const ResponsiveDashboardLayout = ({
  navigation,
  title,
  brandIcon,
  gradientFrom,
  gradientTo,
  gradientVia,
  textColor,
  type = 'admin' // 'admin' or 'merchant'
}) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const accent = ACCENTS[type];

  const isActiveRoute = (href) => {
    const basePath = type === 'admin' ? '/admin' : '/merchant';
    if (href === basePath) return location.pathname === basePath;
    return location.pathname.startsWith(href);
  };

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  const userName = user?.name || (type === 'admin' ? 'Admin' : 'Merchant');
  const initial = userName.charAt(0).toUpperCase();
  const sidebarItems = navigation.filter((item) => !item.pinned);
  const pinnedItems = navigation.filter((item) => item.pinned);
  const sections = sidebarItems.some((item) => item.group) ? groupItems(sidebarItems) : [{ items: sidebarItems }];
  const tabItems = navigation.filter((item) => item.mobileTab).slice(0, 4);
  const sheetItems = navigation.filter((item) => !tabItems.includes(item));
  const activeItem = navigation.find((item) => isActiveRoute(item.href));
  const moreActive = moreOpen || sheetItems.includes(activeItem);

  const renderSidebarLink = (item) => {
    const isActive = isActiveRoute(item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        className={`flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-white/20 font-semibold text-white' : `${textColor} hover:bg-white/10 hover:text-white`
        }`}
      >
        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{item.name}</span>
        {item.badge > 0 && (
          <span className="min-w-[1.25rem] px-1.5 rounded-full bg-green-500 text-white text-[11px] font-bold text-center">
            {badgeText(item.badge)}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-gradient-to-b ${gradientFrom} ${gradientVia} ${gradientTo} text-white`}>
        <div className="h-14 shrink-0 flex items-center gap-2 px-5 border-b border-white/15 text-lg font-bold">
          <span>{brandIcon}</span>
          <span className="truncate">{title}</span>
        </div>

        <div className="shrink-0 mx-3 mt-3 p-3 flex items-center gap-3 rounded-xl bg-white/10 border border-white/15">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white/25 flex items-center justify-center font-bold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{userName}</p>
            {user?.email && <p className={`text-xs ${textColor} truncate`}>{user.email}</p>}
          </div>
          <button
            type="button"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            className="shrink-0 p-2 rounded-lg bg-white/10 hover:bg-red-500/40 transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
          {sections.map((section, index) => (
            <div key={section.label || index}>
              {section.label && (
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {section.label}
                </p>
              )}
              {section.items.map(renderSidebarLink)}
            </div>
          ))}
        </nav>

        {pinnedItems.length > 0 && (
          <div className="shrink-0 border-t border-white/15 px-3 py-2">
            {pinnedItems.map(renderSidebarLink)}
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className={`lg:hidden fixed inset-x-0 top-0 z-40 h-12 flex items-center justify-between gap-3 px-4 bg-gradient-to-r ${gradientFrom} ${gradientVia} ${gradientTo} text-white`}>
        <span className="flex items-center gap-2 min-w-0 font-bold">
          <span>{brandIcon}</span>
          <span className="truncate">{activeItem?.name || title}</span>
        </span>
        <div className="h-8 w-8 shrink-0 rounded-full bg-white/25 flex items-center justify-center text-sm font-bold">
          {initial}
        </div>
      </header>

      {/* Main content */}
      <div className="pt-12 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0 lg:pl-64">
        <main className="min-h-screen">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        {tabItems.map((item) => {
          const isActive = !moreOpen && isActiveRoute(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] ${
                isActive ? `${accent.tab} font-semibold` : 'text-gray-500'
              }`}
            >
              <span className="relative">
                <item.icon className="h-6 w-6" aria-hidden="true" />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[1rem] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold leading-4 text-center">
                    {badgeText(item.badge)}
                  </span>
                )}
              </span>
              <span className="truncate max-w-full px-1">{item.shortName || item.name}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] ${
            moreActive ? `${accent.tab} font-semibold` : 'text-gray-500'
          }`}
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded bg-gray-300" />
            <div className="mb-4 flex items-center gap-3">
              <div className={`h-10 w-10 shrink-0 rounded-full ${accent.avatar} flex items-center justify-center font-bold`}>
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                {user?.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-y-4 text-center">
              {sheetItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1 text-xs ${
                    isActiveRoute(item.href) ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <span className={`relative h-11 w-11 rounded-xl ${accent.tile} flex items-center justify-center`}>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1rem] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold leading-4 text-center">
                        {badgeText(item.badge)}
                      </span>
                    )}
                  </span>
                  <span className="truncate max-w-full px-1">{item.shortName || item.name}</span>
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-5 w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold flex items-center justify-center gap-2"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveDashboardLayout;
