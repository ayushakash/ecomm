import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import i18n, { hasChosenLanguage } from '../i18n';
import analytics from '../services/analytics';
import { playStoreLink } from '../config/app';

// First-app-order offer badge (copy in common.json → appPrompt.offer*). Off until
// app v6 (which applies the discount at checkout) is live on Play.
const APP_OFFER_ENABLED = false;

const SHOW_AFTER_LANDING_MS = 20 * 1000;
// If the visitor is still on the language popup at the 20s mark, give them a
// moment on the page after choosing before the sheet slides up.
const SHOW_AFTER_LANGUAGE_MS = 5 * 1000;
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const DISMISSED_AT_KEY = 'chardeevari.appPrompt.dismissedAt';
const DOWNLOADED_KEY = 'chardeevari.appPrompt.downloaded';
const LANDED_AT_KEY = 'chardeevari.appPrompt.landedAt'; // sessionStorage
// Testing: open any public page with ?app-prompt=1 to show the sheet at once,
// on any device and regardless of dismissal.
const FORCE_PARAM = 'app-prompt';

// Pages where an interruption costs a signup or an order.
const HIDDEN_PATHS = /^\/(login|register|merchant-register|checkout|order-success)(\/|$)/;

// react-snap prerenders public pages for SEO; never bake the prompt into that HTML.
const isPrerender = typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';

/** Android mobile browser — not an Android WebView (e.g. inside our own app). */
const isAndroidBrowser = () =>
  /android/i.test(navigator.userAgent) && !/; wv\)/.test(navigator.userAgent) && !window.ReactNativeWebView;

const readLocal = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the prompt simply may return next visit.
  }
};

const isSuppressed = () => {
  if (readLocal(DOWNLOADED_KEY)) return true;
  const dismissedAt = parseInt(readLocal(DISMISSED_AT_KEY), 10);
  return Boolean(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS;
};

/** When this browser session first landed on the site (survives reloads). */
const getLandedAt = () => {
  try {
    const stored = parseInt(sessionStorage.getItem(LANDED_AT_KEY), 10);
    if (stored) return stored;
    const now = Date.now();
    sessionStorage.setItem(LANDED_AT_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
};

/**
 * Bottom sheet inviting Android visitors to install the Google Play app.
 * Appears 20s after landing, only once the first-visit language choice is made;
 * "Not now" hides it for 7 days, tapping Download hides it for good.
 */
const AppDownloadPrompt = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const shownTracked = useRef(false);
  const forced = !isPrerender && new URLSearchParams(window.location.search).get(FORCE_PARAM) === '1';
  const visible = open && (forced || !HIDDEN_PATHS.test(pathname));

  useEffect(() => {
    if (forced) {
      setOpen(true);
      return undefined;
    }
    if (isPrerender || !isAndroidBrowser() || isSuppressed()) return undefined;

    const landedAt = getLandedAt();
    let timer;
    const schedule = (delay) => {
      clearTimeout(timer);
      timer = setTimeout(() => setOpen(true), Math.max(0, delay));
    };
    const onLanguageChanged = () => {
      if (!hasChosenLanguage()) return;
      i18n.off('languageChanged', onLanguageChanged);
      schedule(Math.max(landedAt + SHOW_AFTER_LANDING_MS - Date.now(), SHOW_AFTER_LANGUAGE_MS));
    };

    if (hasChosenLanguage()) schedule(landedAt + SHOW_AFTER_LANDING_MS - Date.now());
    else i18n.on('languageChanged', onLanguageChanged);

    return () => {
      clearTimeout(timer);
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [forced]);

  useEffect(() => {
    if (!visible || shownTracked.current) return;
    shownTracked.current = true;
    analytics.trackEvent('app_prompt_shown', { placement: 'popup' });
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    writeLocal(DISMISSED_AT_KEY, String(Date.now()));
    setOpen(false);
  };

  const download = () => {
    writeLocal(DOWNLOADED_KEY, String(Date.now()));
    analytics.trackEvent('app_download_click', { placement: 'popup' });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="app-prompt-title">
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-t-3xl bg-white px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('actions.close')}
          className="absolute top-3 right-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <img src="/logo.webp" alt="" className="h-16 w-16 flex-shrink-0 rounded-2xl shadow-md ring-1 ring-black/5" />
          <div className="min-w-0">
            {APP_OFFER_ENABLED && (
              <p className="mb-1.5">
                <span className="inline-block rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  {t('appPrompt.offer')}
                </span>
                <span className="ml-1.5 text-[11px] text-gray-500">{t('appPrompt.offerCondition')}</span>
              </p>
            )}
            <h2 id="app-prompt-title" className="text-lg font-bold leading-snug text-gray-900">
              {t('appPrompt.title')}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{t('appPrompt.appName')}</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {['rateAlerts', 'calculator', 'tracking'].map((key) => (
            <li key={key} className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800">
              {t(`appPrompt.benefits.${key}`)}
            </li>
          ))}
        </ul>

        <a
          href={playStoreLink('popup')}
          target="_blank"
          rel="noopener noreferrer"
          onClick={download}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-base font-bold text-white shadow-lg shadow-green-600/30 transition-colors hover:bg-green-700 active:bg-green-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
          </svg>
          {t('appPrompt.download')}
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          {t('appPrompt.notNow')}
        </button>
      </div>
    </div>
  );
};

export default AppDownloadPrompt;
