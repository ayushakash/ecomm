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
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import { playStoreLink } from '../../config/app';
import {
  BUSINESS_ADDRESS, BUSINESS_EMAIL, BUSINESS_MAPS_URL, BUSINESS_PHONE_LABEL, BUSINESS_PHONE_TEL, whatsappLink,
} from '../../config/contact';
import { LANDING_CONFIGS } from '../../pages/landing/landingConfig';

const LANDING_LINKS = Object.values(LANDING_CONFIGS).map((c) => ({ key: c.key, to: `/${c.slug}` }));

const Footer = ({ cartCount = 0 }) => {
  const location = useLocation();
  const { t } = useTranslation('layout');
  const { t: tl } = useTranslation('landing');

  const navItems = [
    { id: 'home', name: t('nav.home'), href: '/', icon: HomeIcon, iconFilled: HomeIconFilled },
    { id: 'calculator', name: t('nav.calculator'), href: '/calculator', icon: CalculatorIcon, iconFilled: CalculatorIconFilled },
    { id: 'cart', name: t('nav.cart'), href: '/cart', icon: ShoppingCartIcon, iconFilled: ShoppingCartIconFilled },
    { id: 'profile', name: t('nav.profile'), href: '/profile', icon: UserIcon, iconFilled: UserIconFilled }
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
    <>
    {/* Site footer — all devices, static (prerendered): NAP, service area and links
        to every rate page. Bottom padding clears the fixed mobile nav. */}
    <footer className="border-t border-gray-200 bg-white px-4 pt-8 pb-20 md:pb-8 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-base font-extrabold text-ink-700">Chardeevari <span lang="hi">(चारदीवारी)</span></p>
          <p className="mt-1">{t('footer.tagline')}</p>
          <address className="mt-3 not-italic leading-relaxed">{BUSINESS_ADDRESS}</address>
          <p className="mt-2">
            <a href={`tel:${BUSINESS_PHONE_TEL}`} className="font-semibold text-ink-700 hover:text-brand-600">{BUSINESS_PHONE_LABEL}</a>
            {' · '}
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 hover:text-green-800">WhatsApp</a>
          </p>
          <p className="mt-1">
            <a href={`mailto:${BUSINESS_EMAIL}`} className="hover:text-brand-600">{BUSINESS_EMAIL}</a>
          </p>
          <p className="mt-1">{t('footer.hours')}</p>
          <p className="mt-1">
            <a href={BUSINESS_MAPS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:text-brand-700">{t('footer.maps')}</a>
          </p>
        </div>

        <nav aria-label={t('footer.ratesTitle')}>
          <p className="font-extrabold text-ink-700">{t('footer.ratesTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            <li><Link to="/aaj-ka-rate" className="hover:text-brand-600">{t('footer.aajKaRate')}</Link></li>
            {LANDING_LINKS.map((l) => (
              <li key={l.to}><Link to={l.to} className="hover:text-brand-600">{tl(`pages.${l.key}.linkLabel`)}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('footer.companyTitle')}>
          <p className="font-extrabold text-ink-700">{t('footer.companyTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            <li><Link to="/calculator" className="hover:text-brand-600">{t('nav.calculator')}</Link></li>
            <li><Link to="/about" className="hover:text-brand-600">{t('nav.aboutUs')}</Link></li>
            <li><Link to="/contact" className="hover:text-brand-600">{t('nav.contactUs')}</Link></li>
            <li><Link to="/blog" className="hover:text-brand-600">{t('nav.blog')}</Link></li>
            <li>
              <a
                href={playStoreLink('footer')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.trackEvent('app_download_click', { placement: 'footer' })}
                className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:text-green-800"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
                </svg>
                {t('footer.downloadApp')}
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <p className="max-w-7xl mx-auto mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">{t('footer.area')}</p>
    </footer>

    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex justify-around items-center h-16 max-w-7xl mx-auto w-full">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const IconComponent = active ? item.iconFilled : item.icon;

          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                active
                  ? 'text-primary-600 border-t-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              <div className="relative">
                <IconComponent className="h-6 w-6" />
                {item.id === 'cart' && cartCount > 0 && (
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
    </nav>
    </>
  );
};

export default Footer;
