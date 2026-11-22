import React, { useEffect, useState } from 'react';
import { MapPinIcon, XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { areaRequestAPI } from '../services/api';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';

const ITEMS = ['cement', 'sariya', 'balu', 'eent', 'gitti', 'other'];

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

const buildInitial = (user, selectedAddress, selectedCity) => {
  const place = (user && selectedAddress) || selectedCity || {};
  return {
    area: place.area || '',
    city: place.city || '',
    pincode: place.pincode || '',
    lat: place.coordinates?.latitude,
    lng: place.coordinates?.longitude,
    name: user?.name || '',
    phone: normalizePhone(user?.phone) || '',
    items: [],
    note: '',
  };
};

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent';

const AreaRequestModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { selectedAddress, selectedCity } = useLocation();
  const [form, setForm] = useState(() => buildInitial(user, selectedAddress, selectedCity));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(buildInitial(user, selectedAddress, selectedCity));
  }, [isOpen, user, selectedAddress, selectedCity]);

  if (!isOpen) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleItem = (item) => setForm((f) => ({
    ...f,
    items: f.items.includes(item) ? f.items.filter((i) => i !== item) : [...f.items, item],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const city = form.city.trim();
    const area = form.area.trim();
    const pincode = form.pincode.replace(/\D/g, '');
    const phone = normalizePhone(form.phone);
    if (!city) return toast.error(t('areaRequest.errors.city'));
    if (!area && !pincode) return toast.error(t('areaRequest.errors.area'));
    if (!phone && !(user && !form.phone.trim())) return toast.error(t('areaRequest.errors.phone'));

    setSubmitting(true);
    try {
      await areaRequestAPI.create({
        area,
        city,
        pincode: pincode || undefined,
        lat: form.lat,
        lng: form.lng,
        name: form.name.trim() || undefined,
        phone: phone || undefined,
        items: form.items,
        note: form.note.trim() || undefined,
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

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.area')}</label>
                <input type="text" value={form.area} onChange={set('area')} maxLength={120} placeholder={t('areaRequest.areaPlaceholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.city')}</label>
                <input type="text" value={form.city} onChange={set('city')} maxLength={80} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.pincode')}</label>
                <input type="text" inputMode="numeric" value={form.pincode} onChange={set('pincode')} maxLength={6} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.name')}</label>
                <input type="text" value={form.name} onChange={set('name')} maxLength={80} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.phone')}</label>
                <input type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} maxLength={14} required={!user} placeholder={t('areaRequest.phonePlaceholder')} className={inputClass} />
              </div>
            </div>

            <div>
              <p className="block text-xs font-medium text-gray-700 mb-2">{t('areaRequest.items')}</p>
              <div className="flex flex-wrap gap-2">
                {ITEMS.map((item) => {
                  const checked = form.items.includes(item);
                  return (
                    <label
                      key={item}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none transition-colors ${
                        checked ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(item)} className="h-3.5 w-3.5 rounded text-primary-600 focus:ring-primary-500" />
                      {t(`areaRequest.itemLabels.${item}`)}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('areaRequest.note')}</label>
              <textarea value={form.note} onChange={set('note')} maxLength={300} rows={2} placeholder={t('areaRequest.notePlaceholder')} className={inputClass} />
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
