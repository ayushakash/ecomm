/**
 * i18n for customer-facing pages (admin/merchant panels stay English).
 *
 * Translations live in locales/<lng>/<namespace>.json and are picked up automatically.
 * Keys: t('ns:key') or useTranslation('ns'). English is the fallback for missing Hindi keys.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
];
const STORAGE_KEY = 'chardeevari.lang';
const SUPPORTED = LANGUAGES.map((l) => l.code);

const resources = {};
const context = require.context('./locales', true, /^\.\/[a-z]{2}\/[\w-]+\.json$/);
context.keys().forEach((path) => {
  const [, lng, ns] = path.match(/^\.\/([a-z]{2})\/([\w-]+)\.json$/);
  (resources[lng] ??= {})[ns] = context(path);
});

const stored = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
})();

const storedLanguage = SUPPORTED.includes(stored) ? stored : null;
// Prerendered (react-snap) pages are English markup. Hydration must start from
// the same language or React discards the HTML and re-renders the whole page
// (hydration error #418/#423 → large layout shift). The stored choice is applied
// right after hydration via applyStoredLanguage().
const hydratingPrerender = Boolean(document.getElementById('root')?.hasChildNodes());

// BCP 47 tags for <html lang>; public/index.html ships "en-IN".
const HTML_LANG = { en: 'en-IN', hi: 'hi-IN' };

i18n.use(initReactI18next).init({
  resources,
  lng: hydratingPrerender ? 'en' : storedLanguage || 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED,
  ns: Object.keys(resources.en ?? {}),
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

document.documentElement.lang = HTML_LANG[i18n.language] || i18n.language;

let chosen = Boolean(storedLanguage);

/** True once the visitor has picked a language (prompt or toggle). */
export const hasChosenLanguage = () => chosen;

/** Apply this browser's saved language once prerendered markup has hydrated. */
export function applyStoredLanguage() {
  if (storedLanguage && storedLanguage !== i18n.language) {
    document.documentElement.lang = HTML_LANG[storedLanguage];
    i18n.changeLanguage(storedLanguage);
  }
}

/** Switch language and remember the choice on this browser. */
export function setLanguage(lng) {
  if (!SUPPORTED.includes(lng)) return;
  chosen = true;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Private mode: choice lasts for this session only.
  }
  document.documentElement.lang = HTML_LANG[lng];
  i18n.changeLanguage(lng);
}

export default i18n;
