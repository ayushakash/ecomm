/**
 * i18n for customer-facing pages (admin/merchant panels stay English).
 *
 * Translations live in locales/<lng>/<namespace>.json and are picked up automatically.
 * Keys: t('ns:key') or useTranslation('ns'). English is the fallback for missing Hindi keys.
 *
 * English ships in the main bundle. Hindi is one separate chunk (all namespaces)
 * fetched only when Hindi is selected — see loadLanguage().
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
];
const STORAGE_KEY = 'chardeevari.lang';
const SUPPORTED = LANGUAGES.map((l) => l.code);
const NS_FILE = /^\.\/([\w-]+)\.json$/;

const en = {};
const enContext = require.context('./locales/en', false, /^\.\/[\w-]+\.json$/);
enContext.keys().forEach((path) => {
  en[path.match(NS_FILE)[1]] = enContext(path);
});

// 'lazy-once': every Hindi namespace goes into a single async chunk.
const lazyContexts = {
  hi: require.context('./locales/hi', false, /^\.\/[\w-]+\.json$/, 'lazy-once'),
};
const loading = {};

/** Fetch a language's translations (once) and register them with i18next. */
function loadLanguage(lng) {
  const context = lazyContexts[lng];
  if (!context) return Promise.resolve();
  loading[lng] ??= Promise.all(
    context.keys().map((path) =>
      context(path).then((mod) => {
        i18n.addResourceBundle(lng, path.match(NS_FILE)[1], mod.default ?? mod, true, true);
      })
    )
  ).catch((err) => {
    delete loading[lng]; // network hiccup: allow a retry on the next switch
    throw err;
  });
  return loading[lng];
}

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
  resources: { en },
  // Always boot in English; another language is switched to once its chunk loads.
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED,
  ns: Object.keys(en),
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

document.documentElement.lang = HTML_LANG.en;

let chosen = Boolean(storedLanguage);
// Last language asked for: a slow chunk must not override a newer choice.
let requested = 'en';

function switchTo(lng) {
  requested = lng;
  return loadLanguage(lng)
    .then(() => {
      if (requested !== lng || i18n.language === lng) return undefined;
      document.documentElement.lang = HTML_LANG[lng];
      return i18n.changeLanguage(lng);
    })
    .catch(() => {
      // Chunk failed to load (offline): stay on the current language.
    });
}

/**
 * Resolves once the initial language is ready. index.js waits for it before a
 * fresh (non-prerendered) render so a Hindi visitor doesn't see English first.
 */
export const i18nReady =
  !hydratingPrerender && storedLanguage && storedLanguage !== 'en' ? switchTo(storedLanguage) : Promise.resolve();

/** True once the visitor has picked a language (prompt or toggle). */
export const hasChosenLanguage = () => chosen;

/** Apply this browser's saved language once prerendered markup has hydrated. */
export function applyStoredLanguage() {
  if (storedLanguage && storedLanguage !== i18n.language) switchTo(storedLanguage);
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
  switchTo(lng);
}

export default i18n;
