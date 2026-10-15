import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasChosenLanguage, LANGUAGES, setLanguage } from './index';

// react-snap prerenders public pages for SEO; never bake the prompt into that HTML.
const isPrerender = typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';

/** One-time "choose your language" dialog on the first visit. */
const LanguagePrompt = () => {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(() => !isPrerender && !hasChosenLanguage());
  if (!open) return null;

  const choose = (lng) => {
    setLanguage(lng);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lang-prompt-title">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
        <h2 id="lang-prompt-title" className="text-lg font-bold text-gray-900">
          Choose your language
          <span className="block text-base font-semibold text-gray-700">अपनी भाषा चुनें</span>
        </h2>
        <div className="mt-5 grid gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => choose(l.code)}
              className="w-full py-3 rounded-xl border-2 border-gray-200 text-base font-semibold text-gray-900 hover:border-brand-500 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">{t('language.changeLater')}</p>
      </div>
    </div>
  );
};

export default LanguagePrompt;
