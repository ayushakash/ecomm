import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingCartIcon,
  CalculatorIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconFilled,
  ShoppingCartIcon as ShoppingCartIconFilled,
  CalculatorIcon as CalculatorIconFilled,
  UserIcon as UserIconFilled
} from '@heroicons/react/24/solid';

const Footer = ({ cartCount = 0 }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Home', href: '/', icon: HomeIcon, iconFilled: HomeIconFilled },
    { name: 'Calculator', href: '/calculator', icon: CalculatorIcon, iconFilled: CalculatorIconFilled },
    { name: 'Cart', href: '/cart', icon: ShoppingCartIcon, iconFilled: ShoppingCartIconFilled },
    { name: 'Profile', href: '/profile', icon: UserIcon, iconFilled: UserIconFilled }
  ];

  const isActive = (href) => {
    // Exact match takes priority
    if (location.pathname === href) return true;

    // For root path, only exact match
    if (href === '/') return false;

    // Nested match - only if there's no exact match in nav items
    if (location.pathname.startsWith(href + '/')) {
      const hasExactMatch = navItems.some(item => item.href === location.pathname);
      return !hasExactMatch;
    }

    return false;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex justify-around items-center h-16 max-w-7xl mx-auto w-full">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const IconComponent = active ? item.iconFilled : item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                active
                  ? 'text-primary-600 border-t-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              <div className="relative">
                <IconComponent className="h-6 w-6" />
                {item.name === 'Cart' && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium border-2 border-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </footer>
  );
};

export default Footer;
