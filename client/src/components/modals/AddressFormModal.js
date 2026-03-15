import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { addressAPI } from '../../services/api';
import { reverseGeocode } from '../../services/geocodingService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MapPinIcon, XMarkIcon, MapIcon } from '@heroicons/react/24/outline';
import MapPickerModal from '../map/MapPickerModal';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const emptyForm = {
  phoneNumber: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  addressType: 'home',
  coordinates: { latitude: null, longitude: null }
};

/**
 * Shared address form modal used in both Checkout and My Addresses pages.
 * Props:
 *   isOpen       - boolean to show/hide
 *   onClose      - called when modal is dismissed
 *   onSuccess    - called after a successful save (use to refetch parent list)
 *   editingAddress - address object to pre-populate for editing (null = add new)
 */
const AddressFormModal = ({ isOpen, onClose, onSuccess, editingAddress = null }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [capturingCoordinates, setCapturingCoordinates] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  // Pre-populate form when editing, or prefill phone from user account
  useEffect(() => {
    if (editingAddress) {
      setForm({
        phoneNumber: editingAddress.phoneNumber || user?.phone || '',
        addressLine1: editingAddress.addressLine1 || '',
        addressLine2: editingAddress.addressLine2 || '',
        landmark: editingAddress.landmark || '',
        area: editingAddress.area || '',
        city: editingAddress.city || '',
        state: editingAddress.state || '',
        pincode: editingAddress.pincode || '',
        addressType: editingAddress.addressType || 'home',
        coordinates: {
          latitude: editingAddress.coordinates?.latitude || null,
          longitude: editingAddress.coordinates?.longitude || null
        }
      });
    } else {
      setForm({ ...emptyForm, phoneNumber: user?.phone || '' });
    }
  }, [editingAddress, isOpen, user?.phone]);

  const createMutation = useMutation({
    mutationFn: (data) => addressAPI.createAddress(data),
    onSuccess: () => {
      toast.success('Address added successfully!');
      onClose();
      setForm(emptyForm);
      onSuccess?.();
    },
    onError: (err) => {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const messages = Array.isArray(errors)
          ? errors.map(e => e.msg).join('\n')
          : Object.values(errors).join('\n');
        toast.error(messages, { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Failed to add address');
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => addressAPI.updateAddress(editingAddress._id, data),
    onSuccess: () => {
      toast.success('Address updated successfully!');
      onClose();
      onSuccess?.();
    },
    onError: (err) => {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const messages = Array.isArray(errors)
          ? errors.map(e => e.msg).join('\n')
          : Object.values(errors).join('\n');
        toast.error(messages, { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Failed to update address');
      }
    }
  });

  const handleInputChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const captureCoordinates = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }
    setCapturingCoordinates(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const addressData = await reverseGeocode(latitude, longitude);
          if (addressData.success) {
            setForm(prev => ({
              ...prev,
              coordinates: { latitude, longitude },
              area: addressData.area || prev.area,
              city: addressData.city || prev.city,
              state: addressData.state || prev.state,
              pincode: addressData.pincode || prev.pincode
            }));
          } else {
            setForm(prev => ({ ...prev, coordinates: { latitude, longitude } }));
          }
        } catch {
          setForm(prev => ({ ...prev, coordinates: { latitude, longitude } }));
        }
        setCapturingCoordinates(false);
      },
      (error) => {
        const msgs = {
          1: 'Location access denied. Please enable location permissions.',
          2: 'Location information unavailable.',
          3: 'Location request timed out.'
        };
        toast.error(msgs[error.code] || 'Unable to get your location');
        setCapturingCoordinates(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleMapConfirm = ({ lat, lng, address }) => {
    const update = {
      coordinates: { latitude: lat, longitude: lng },
    };
    if (address) {
      if (address.area) update.area = address.area;
      if (address.city) update.city = address.city;
      if (address.state) update.state = address.state;
      if (address.pincode) update.pincode = address.pincode;
    }
    setForm(prev => ({ ...prev, ...update }));
    toast.success('Location selected! Please verify the prefilled fields.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const addressTypeLabel = form.addressType.charAt(0).toUpperCase() + form.addressType.slice(1);
    const payload = {
      ...form,
      fullName: user?.name || '',
      title: `${addressTypeLabel} - ${form.area}`
    };

    if (editingAddress) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  const existingCoords = form.coordinates?.latitude
    ? { lat: form.coordinates.latitude, lng: form.coordinates.longitude }
    : null;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-orange-50 to-stone-50 rounded-xl mr-3 shadow-md">
                <MapPinIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={captureCoordinates}
                disabled={capturingCoordinates}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
              >
                {capturingCoordinates ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>Detecting...</>
                ) : (
                  <><MapPinIcon className="w-4 h-4" />Use GPS</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl text-sm font-semibold transition-all duration-200"
              >
                <MapIcon className="w-4 h-4" />
                Select on Map
              </button>
            </div>
            {form.coordinates?.latitude && (
              <p className="text-xs text-green-600 font-medium -mt-1">
                Location set: {form.coordinates.latitude.toFixed(5)}, {form.coordinates.longitude.toFixed(5)}
              </p>
            )}

            {/* Address Type */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Address Type <span className="text-red-500">*</span>
              </label>
              <select
                name="addressType"
                value={form.addressType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="home">🏠 Home</option>
                <option value="office">🏢 Office</option>
                <option value="other">📍 Other</option>
              </select>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleInputChange}
                placeholder="10-digit mobile number"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              />
            </div>

            {/* Address Line 1 */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Full Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleInputChange}
                placeholder="House/Flat number, Street name"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              />
            </div>

            {/* Address Line 2 */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleInputChange}
                placeholder="Apartment, suite, etc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              />
            </div>

            {/* Area / City / Pincode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Area/Locality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="area"
                  value={form.area}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Koramangala"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Bangalore"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleInputChange}
                  required
                  placeholder="6-digit pincode"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>
            </div>

            {/* State / Landmark */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={form.state}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  name="landmark"
                  value={form.landmark}
                  onChange={handleInputChange}
                  placeholder="Near a landmark"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </span>
                ) : (
                  editingAddress ? '✓ Update Address' : '✓ Save Address'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <MapPickerModal
      isOpen={mapPickerOpen}
      onClose={() => setMapPickerOpen(false)}
      onConfirm={handleMapConfirm}
      initialPosition={existingCoords}
    />
    </>
  );
};

export default AddressFormModal;
