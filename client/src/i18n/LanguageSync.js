import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { hasChosenLanguage, setLanguage } from './index';

/**
 * Keeps a signed-in customer's account language (used for order notifications)
 * in step with the site language. A choice made on this browser wins; with no
 * local choice yet, the account's saved language is applied.
 */
const LanguageSync = () => {
  const { i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const isCustomer = user?.role === 'customer';
  const accountLanguage = user?.language;

  useEffect(() => {
    if (!isCustomer) return;
    if (!hasChosenLanguage() && accountLanguage) {
      if (accountLanguage !== i18n.language) setLanguage(accountLanguage);
      return;
    }
    if (accountLanguage === i18n.language) return;
    api
      .put('/api/users/profile', { language: i18n.language })
      .then((res) => setUser(res.data.user))
      .catch(() => {});
  }, [isCustomer, accountLanguage, i18n.language, setUser]);

  return null;
};

export default LanguageSync;
