import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LocationConfirmation = ({ onLocationConfirm, customerAddress }) => {
  const { t } = useTranslation('location');
  const [loading, setLoading] = useState(false);
  const [manualLocation, setManualLocation] = useState(customerAddress || '');
  const [locationMethod, setLocationMethod] = useState('manual'); // 'current' or 'manual'

  const getCurrentLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      alert(t('errors.notSupported'));
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          coordinates: [position.coords.longitude, position.coords.latitude],
          address: manualLocation || customerAddress,
          isCurrentLocation: true,
          accuracy: position.coords.accuracy
        };
        
        console.log('Current location obtained:', location);
        onLocationConfirm(location);
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = t('errors.unableToGet') + ' ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += t('errors.denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += t('errors.unavailable');
            break;
          case error.TIMEOUT:
            errorMessage += t('errors.timeout');
            break;
          default:
            errorMessage += t('errors.unknown');
            break;
        }
        
        alert(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const useManualLocation = () => {
    if (!manualLocation.trim()) {
      alert(t('confirmation.enterAddressAlert'));
      return;
    }

    const location = {
      coordinates: [0, 0], // Will be geocoded on backend if needed
      address: manualLocation.trim(),
      isCurrentLocation: false
    };

    console.log('Manual location set:', location);
    onLocationConfirm(location);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">📍 {t('confirmation.title')}</h3>
      <p className="text-sm text-blue-700 mb-4">
        {t('confirmation.subtitle')}
      </p>

      <div className="space-y-4">
        {/* Location Method Selection */}
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="current"
              checked={locationMethod === 'current'}
              onChange={(e) => setLocationMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm font-medium">{t('confirmation.useCurrent')}</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="manual"
              checked={locationMethod === 'manual'}
              onChange={(e) => setLocationMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm font-medium">{t('enterManually')}</span>
          </label>
        </div>

        {/* Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('confirmation.addressLabel')}
          </label>
          <textarea
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            placeholder={t('confirmation.addressPlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="3"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {locationMethod === 'current' ? (
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {t('gettingLocation')}
                </>
              ) : (
                <>
                  📍 {t('confirmation.useCurrentRecommended')}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={useManualLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              ✅ {t('confirmation.confirmAddress')}
            </button>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-800">
            <span className="font-medium">{t('confirmation.benefitsTitle')}</span>
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>{t('confirmation.benefits.fasterAssignment')}</li>
              <li>{t('confirmation.benefits.accurateEstimates')}</li>
              <li>{t('confirmation.benefits.betterCompletion')}</li>
              <li>{t('confirmation.benefits.lowerCharges')}</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationConfirmation;