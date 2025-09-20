import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const MerchantRegister = () => {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Business Details, 3: OTP Verification
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    phone: '',
    email: '',

    // Business Details
    businessName: '',
    businessType: '',
    gstNumber: '',
    panNumber: '',

    // Address
    address: '',
    area: '',
    city: '',
    state: '',
    pincode: '',

    // Location coordinates (will be filled via map/geolocation)
    latitude: '',
    longitude: '',

    // OTP
    otp: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Contact person name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType.trim()) {
      newErrors.businessType = 'Business type is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Business address is required';
    }


    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (!formData.otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (formData.otp.trim() !== '1234') {
      newErrors.otp = 'Invalid OTP. Please enter 1234';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleSendOTP();
    }
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    try {
      // Send OTP to merchant's phone
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setStep(3);
        toast.success(`OTP sent to +91${formData.phone}. Please enter 1234 to verify.`);
      } else {
        throw new Error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsLoading(true);
    try {
      // Register the merchant - flat structure to match backend expectations
      const merchantData = {
        name: formData.businessName.trim(),
        contactPhone: formData.phone.trim(),
        contactEmail: formData.email.trim() || '',
        contactName: formData.name.trim(),
        businessType: formData.businessType.trim(),
        gstNumber: formData.gstNumber.trim(),
        panNumber: formData.panNumber.trim(),
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : 28.6139,
        longitude: formData.longitude ? parseFloat(formData.longitude) : 77.2090,
        otp: formData.otp.trim()
      };

      const response = await fetch('/api/auth/register-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merchantData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Merchant registration successful! Please wait for admin approval.');
        navigate('/pending-approval');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationFromMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          toast.success('Location captured successfully!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get your location. Please enter manually if needed.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const renderStep1 = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Contact Information</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Person Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter contact person name"
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            maxLength={10}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter mobile number"
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter email address"
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Next: Business Details
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Business Information</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.businessName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter business name"
          />
          {errors.businessName && <p className="text-red-600 text-sm mt-1">{errors.businessName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type *
          </label>
          <select
            value={formData.businessType}
            onChange={(e) => handleInputChange('businessType', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.businessType ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select business type</option>
            <option value="Hardware Store">Hardware Store</option>
            <option value="Building Materials">Building Materials</option>
            <option value="Electrical Supplies">Electrical Supplies</option>
            <option value="Plumbing Supplies">Plumbing Supplies</option>
            <option value="Paint & Coatings">Paint & Coatings</option>
            <option value="Tools & Equipment">Tools & Equipment</option>
            <option value="Cement & Steel">Cement & Steel</option>
            <option value="Other">Other</option>
          </select>
          {errors.businessType && <p className="text-red-600 text-sm mt-1">{errors.businessType}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => handleInputChange('gstNumber', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent border-gray-300"
              placeholder="Enter GST number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN Number (Optional)
            </label>
            <input
              type="text"
              value={formData.panNumber}
              onChange={(e) => handleInputChange('panNumber', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent border-gray-300"
              placeholder="Enter PAN number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Address *
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.address ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter complete business address"
          />
          {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area *
            </label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => handleInputChange('area', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.area ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter area/locality"
            />
            {errors.area && <p className="text-red-600 text-sm mt-1">{errors.area}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.city ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter city"
            />
            {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.state ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter state"
            />
            {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincode *
            </label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => handleInputChange('pincode', e.target.value)}
              maxLength={6}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.pincode ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter pincode"
            />
            {errors.pincode && <p className="text-red-600 text-sm mt-1">{errors.pincode}</p>}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Location Services (Optional)</h4>
          <p className="text-sm text-blue-700 mb-3">
            Allow location access to help customers find your business more easily.
          </p>
          <button
            type="button"
            onClick={getLocationFromMap}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            📍 Get Current Location
          </button>
          {formData.latitude && formData.longitude && (
            <p className="text-sm text-green-600 mt-2">
              ✅ Location captured: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
            </p>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setStep(1)}
            className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Verify Mobile Number</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <div className="flex items-center">
          <span className="text-blue-600 mr-2">ℹ️</span>
          <span className="text-blue-800 text-sm">For demo purposes, please enter: 1234</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter OTP sent to +91{formData.phone}
          </label>
          <input
            type="text"
            value={formData.otp}
            onChange={(e) => handleInputChange('otp', e.target.value)}
            maxLength={4}
            className={`w-full px-3 py-2 border rounded-md text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.otp ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="1234"
          />
          {errors.otp && <p className="text-red-600 text-sm mt-1">{errors.otp}</p>}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(2)}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            ← Back to Business Info
          </button>
          <button
            onClick={handleSendOTP}
            className="text-sm text-primary-600 hover:text-primary-500 underline"
          >
            Resend OTP
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            'Complete Registration'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🏪</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Merchant Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join our platform and start selling construction materials
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 1 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-300'
          }`}>
            <span className="text-sm font-medium">1</span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 2 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-300'
          }`}>
            <span className="text-sm font-medium">2</span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 3 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-300'
          }`}>
            <span className="text-sm font-medium">3</span>
          </div>
        </div>

        {/* Render current step */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </Link>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Looking for customer registration?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Customer Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MerchantRegister;