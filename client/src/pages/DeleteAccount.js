import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DeleteAccountPanel from '../components/account/DeleteAccountPanel';
import SEO from '../components/SEO/SEO';
import { useTranslation } from 'react-i18next';

const SUPPORT_PHONE = '+91 6201176610';

/**
 * Public account-deletion page (Google Play "delete account" web link).
 * Customers log in with their phone OTP, then delete. Works without the app installed.
 */
const DeleteAccount = () => {
  const { t } = useTranslation('account');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const goToLogin = () => {
    localStorage.setItem('postLoginRedirect', '/delete-account');
    navigate('/login', { state: { from: { pathname: '/delete-account' } } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Delete your account | Chardeevari" description="Request deletion of your Chardeevari account and personal data." />
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('deletePage.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('deletePage.intro')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-700 space-y-2">
          <p className="font-semibold text-gray-900">{t('deletePage.whatHappens')}</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>{t('deletePage.items.personal')}</li>
            <li>{t('deletePage.items.saved')}</li>
            <li>{t('deletePage.items.invoices')}</li>
            <li>{t('deletePage.items.activeOrders')}</li>
          </ul>
        </div>

        {loading ? null : user?.role === 'customer' ? (
          <DeleteAccountPanel />
        ) : user ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-700">
            {t('deletePage.notCustomer', { phone: SUPPORT_PHONE })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <p className="text-sm text-gray-700">{t('deletePage.loginPrompt')}</p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-semibold"
            >
              {t('deletePage.loginButton')}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          {t('deletePage.help', { phone: SUPPORT_PHONE })}
        </p>
      </div>
    </div>
  );
};

export default DeleteAccount;
