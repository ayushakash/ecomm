import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Enter details, 2: Verify OTP
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const validateStep1 = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (otp.trim() !== '1234') {
      newErrors.otp = 'Invalid OTP. Please enter 1234';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateStep1()) return;

    setIsLoading(true);
    try {
      // Simulate API call to send OTP
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`OTP sent to +91${mobile}. Please enter 1234 to verify.`);
      setStep(2);
    } catch (error) {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    try {
      // Create user account with simplified data
      const userData = {
        name: name.trim(),
        phone: mobile.trim(),
        password: 'temp123456', // Temporary password - will be updated when user sets up profile
        role: 'customer'
      };

      const result = await registerUser(userData);
      if (result.success) {
        toast.success('Registration successful!');
        navigate('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Quick registration with mobile verification
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
        </div>

        {step === 1 ? (
          // Step 1: Enter Details
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Enter Your Details</h3>
            <p className="text-sm text-gray-600 mb-6">We'll send you an OTP to verify your mobile number</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.mobile ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your mobile number"
                />
                {errors.mobile && <p className="text-red-600 text-sm mt-1">{errors.mobile}</p>}
              </div>

              <button
                onClick={handleSendOTP}
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  'Send OTP'
                )}
              </button>
            </div>
          </div>
        ) : (
          // Step 2: Verify OTP
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Verify Mobile Number</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter the 4-digit OTP sent to +91{mobile}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <span className="text-blue-800 text-sm">For demo purposes, please enter: 1234</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
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
                  onClick={() => setStep(1)}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  ← Change Number
                </button>
                <button
                  onClick={handleSendOTP}
                  className="text-sm text-primary-600 hover:text-primary-500 underline"
                >
                  Resend OTP
                </button>
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  'Verify & Register'
                )}
              </button>
            </div>
          </div>
        )}

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
        </div>
      </div>
    </div>
  );
};

export default Register;
