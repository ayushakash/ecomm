import React, { useEffect, useState } from 'react';
import { MapPinIcon, XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { areaRequestAPI } from '../services/api';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

const buildPlace = (user, selectedAddress, selectedCity) => (user && selectedAddress) || selectedCity || {};

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent';

const AreaRequestModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { selectedAddress, selectedCity } = useLocation();
  const place = buildPlace(user, selectedAddress, selectedCity);
  const [area, setArea] = useState(place.area || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setArea(buildPlace(user, selectedAddress, selectedCity).area || '');
  }, [isOpen, user, selectedAddress, selectedCity]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = area.trim();
    if (trimmed.length < 2) return toast.error(t('areaRequest.errors.area'));
    // Pincode/coordinates describe the prefilled place only; drop them if the customer typed a different area.
    const samePlace = trimmed === String(place.area || '').trim();
    const phone = normalizePhone(user?.phone);

    setSubmitting(true);
    try {
      await areaRequestAPI.create({
        area: trimmed,
        city: place.city || undefined,
        pincode: samePlace ? place.pincode || undefined : undefined,
        lat: samePlace ? place.coordinates?.latitude : undefined,
        lng: samePlace ? place.coordinates?.longitude : undefined,
        name: user?.name || undefined,
        phone: phone || undefined,
        source: 'web',
      });
      toast.success(t('areaRequest.success'), { duration: 6000 });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || t('areaRequest.errors.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full text-left">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('actions.close')}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 pr-8">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPinIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t('areaRequest.title')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('areaRequest.subtitle')}</p>
              </div>
            </div>

            <div>
              <label htmlFor="area-request-area" className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.area')}</label>
              <input id="area-request-area" type="text" value={area} onChange={(e) => setArea(e.target.value)} minLength={2} maxLength={100} required autoFocus placeholder={t('areaRequest.areaPlaceholder')} className={inputClass} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors"
            >
              {submitting ? t('areaRequest.submitting') : t('areaRequest.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const AreaRequestButton = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${className}`}
      >
        <MegaphoneIcon className="w-4 h-4" />
        {t('areaRequest.button')}
      </button>
      <AreaRequestModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AreaRequestModal;
