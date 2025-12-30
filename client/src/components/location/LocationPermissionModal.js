import React, { useState } from 'react';
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';

const LocationPermissionModal = ({ isOpen, onClose, onEnableLocation, onSkip }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleEnableLocation = async () => {
    setIsLoading(true);
    try {
      await onEnableLocation();
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-auto transform transition-all">
          {/* Close Button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          >
            <XMarkIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-stone-100 to-orange-100 rounded-full flex items-center justify-center shadow-lg mb-4 animate-pulse">
                <MapPinIcon className="w-12 h-12 text-orange-500" />
              </div>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Enable Location Access
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-2 text-sm sm:text-base leading-relaxed">
              We need your location to show nearby merchants and provide accurate delivery estimates
            </p>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-stone-50 to-orange-50 rounded-2xl p-4 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Find Nearby Merchants</p>
                    <p className="text-xs text-gray-600">Get construction materials from stores near you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Faster Delivery</p>
                    <p className="text-xs text-gray-600">Quick delivery to your exact location</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Better Experience</p>
                    <p className="text-xs text-gray-600">Personalized recommendations based on your area</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleEnableLocation}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-stone-600 to-orange-500 hover:from-stone-700 hover:to-orange-600 text-white rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Getting Location...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <MapPinIcon className="h-5 w-5" />
                    Enable Location
                  </span>
                )}
              </button>

              <button
                onClick={onSkip}
                className="w-full py-3 px-6 bg-white text-gray-700 rounded-xl font-semibold text-sm border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Skip for Now
              </button>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-gray-500 mt-4">
              🔒 Your location data is secure and only used to improve your shopping experience
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
