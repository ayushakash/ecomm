import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage } from './index';

/** Compact EN / हिं switch for the header and mobile menu. */
const LanguageToggle = ({ className = '' }) => {
  const { i18n, t } = useTranslation('common');
  return (
    <div className={`inline-flex rounded-full border border-gray-300 overflow-hidden text-xs font-semibold ${className}`} role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLanguage(l.code)}
          aria-pressed={i18n.language === l.code}
          className={`px-2.5 py-1 ${i18n.language === l.code ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {l.code === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
