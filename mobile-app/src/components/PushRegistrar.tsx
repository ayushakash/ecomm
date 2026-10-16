import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { pushAPI } from '../services/api';
import { getPushToken } from '../services/notifications';

/**
 * Registers every install for push right after launch — guests included — so offers
 * reach people who never log in. Re-runs on login/logout (attaches/detaches the
 * customer server-side), city and language changes. Asks the OS permission once.
 */
export function PushRegistrar() {
  const { user, loading } = useAuth();
  const { currentCity } = useLocation();
  const { i18n } = useTranslation();
  const userId = user?._id ?? null;
  const language = i18n.language;

  useEffect(() => {
    if (loading || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    let cancelled = false;
    getPushToken()
      .then((token) => {
        if (!token || cancelled) return;
        return pushAPI.register({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android', city: currentCity, language });
      })
      .catch((error) => console.warn('Push registration failed:', error));
    return () => {
      cancelled = true;
    };
  }, [loading, userId, currentCity, language]);

  return null;
}
