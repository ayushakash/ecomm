import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const CONFIRM_WORD = 'DELETE';

/**
 * Permanent account deletion for signed-in customers (Google Play requirement).
 * Used on /profile and the public /delete-account page. Mirrors the mobile app sheet.
 */
const DeleteAccountPanel = () => {
  const { t } = useTranslation('account');
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteAccount();
    setDeleting(false);
    if (result.success) {
      toast.success(t('deletePanel.success'));
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <h2 className="text-sm font-bold text-red-700">{t('deletePanel.title')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('deletePanel.subtitle')}
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            {t('deletePanel.open')}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-semibold">{t('deletePanel.warning')}</p>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-5">
              <li>{t('deletePanel.items.personal')}</li>
              <li>{t('deletePanel.items.saved')}</li>
              <li>{t('deletePanel.items.invoices')}</li>
            </ul>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">{t('deletePanel.typeToConfirm', { word: CONFIRM_WORD })}</span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </label>
            {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTyped('');
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('deletePanel.cancel')}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={deleting || typed.trim().toUpperCase() !== CONFIRM_WORD}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                {deleting ? t('deletePanel.deleting') : t('deletePanel.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountPanel;
