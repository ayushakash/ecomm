import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO/SEO';

/**
 * Catch-all for unknown URLs. Rendered (not redirected to home) so search
 * engines see a noindex page instead of a duplicate homepage (soft 404).
 * Prerendered as build/404.html, which nginx serves with HTTP 404.
 */
const NotFound = () => {
  const { t } = useTranslation('notFound');

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <SEO title={`404 – ${t('title')}`} description={t('text')} noindex />
      <p className="text-5xl font-extrabold text-gray-300">404</p>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">{t('heading')}</h1>
      <p className="mt-2 text-gray-600">{t('text')}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/" className="py-3 rounded-xl bg-primary-700 hover:bg-primary-800 text-white font-semibold">
          {t('home')}
        </Link>
        <Link to="/products" className="py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold">
          {t('products')}
        </Link>
        <Link to="/aaj-ka-rate" className="py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold">
          {t('rates')}
        </Link>
        <Link to="/contact" className="py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold">
          {t('contact')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
