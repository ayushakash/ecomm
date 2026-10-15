/**
 * App i18n (English / Hindi). Strings live in locales/<lng>/<namespace>.json;
 * use `useTranslation('<namespace>')` and `t('key')`. English is the fallback.
 * Adding a namespace: create the JSON in every language and add it to locales/<lng>/index.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import hi from './locales/hi';

export type Language = 'en' | 'hi';
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
];
const STORAGE_KEY = 'chardeevari.lang';
const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'hi';

i18n.use(initReactI18next).init({
  resources: { en, hi },
  lng: 'en',
  fallbackLng: 'en',
  ns: Object.keys(en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Applies the saved language; resolves to whether the user has chosen one yet. */
export async function loadLanguage(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  if (!isLanguage(stored)) return false;
  await i18n.changeLanguage(stored);
  return true;
}

/** Switches language and remembers the choice on this device. */
export async function setLanguage(lng: Language): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => {});
  await i18n.changeLanguage(lng);
}

export const currentLanguage = (): Language => (isLanguage(i18n.language) ? i18n.language : 'en');

export default i18n;
