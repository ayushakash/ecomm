import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DeleteAccountPanel from '../components/account/DeleteAccountPanel';
import SEO from '../components/SEO/SEO';

const SUPPORT_PHONE = '+91 6201176610';

/**
 * Public account-deletion page (Google Play "delete account" web link).
 * Customers log in with their phone OTP, then delete. Works without the app installed.
 */
const DeleteAccount = () => {
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
          <h1 className="text-xl font-bold text-gray-900">Delete your Chardeevari account</h1>
          <p className="text-sm text-gray-600 mt-1">
            You can permanently delete your account from the Chardeevari app (Account → Delete account) or right here.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-700 space-y-2">
          <p className="font-semibold text-gray-900">What happens when you delete</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Your name, phone number, email and Google sign-in link are erased immediately.</li>
            <li>Your saved addresses, cart and reviews are deleted.</li>
            <li>
              Invoices for past orders are retained as required by Indian GST law, but are no longer linked to any account.
            </li>
            <li>If an order is still being delivered, please wait for it to be delivered or cancel it first.</li>
          </ul>
        </div>

        {loading ? null : user?.role === 'customer' ? (
          <DeleteAccountPanel />
        ) : user ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-700">
            Merchant and admin accounts can't be deleted here. Please contact support at {SUPPORT_PHONE}.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <p className="text-sm text-gray-700">Log in with your registered phone number to continue.</p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-semibold"
            >
              Log in to delete account
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Need help? Call or WhatsApp {SUPPORT_PHONE}.
        </p>
      </div>
    </div>
  );
};

export default DeleteAccount;
