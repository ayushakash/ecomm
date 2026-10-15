import React from 'react';
import {
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  ShoppingBagIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const LocationEducationModal = ({ isOpen, onClose, onAllowLocation, onManualEntry }) => {
  const { t } = useTranslation('location');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative animate-slideUp">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('close')}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPinIcon className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('education.title')}
          </h2>
          <p className="text-gray-600 text-center text-sm">
            {t('education.subtitle')}
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <ShoppingBagIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{t('education.availableProducts.title')}</h3>
              <p className="text-gray-600 text-xs mt-1">
                {t('education.availableProducts.text')}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <TruckIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{t('education.fasterDelivery.title')}</h3>
              <p className="text-gray-600 text-xs mt-1">
                {t('education.fasterDelivery.text')}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <ClockIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{t('education.accurateTimes.title')}</h3>
              <p className="text-gray-600 text-xs mt-1">
                {t('education.accurateTimes.text')}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <MapPinIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{t('education.supportLocal.title')}</h3>
              <p className="text-gray-600 text-xs mt-1">
                {t('education.supportLocal.text')}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 space-y-3">
          <button
            onClick={onAllowLocation}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <MapPinIcon className="w-5 h-5 mr-2" />
            {t('useMyCurrentLocation')}
          </button>

          <button
            onClick={onManualEntry}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {t('enterManually')}
          </button>
        </div>

        {/* Privacy note */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-500 text-center">
            🔒 {t('education.privacy')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationEducationModal;
