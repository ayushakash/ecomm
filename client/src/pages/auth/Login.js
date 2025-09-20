import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userExists, setUserExists] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const { login, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const validateMobile = () => {
    const newErrors = {};
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTP = () => {
    const newErrors = {};
    if (!otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (otp.trim() !== '1234') {
      newErrors.otp = 'Invalid OTP. Please enter 1234';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailPassword = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.trim().length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateMobile()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setUserExists(data.userExists);
        if (data.userExists && data.userRole) {
          setUserRole(data.userRole);
        }
        setStep(2);
        toast.success(`OTP sent to +91${mobile}. Please enter 1234 to verify.`);
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

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return;

    if (!userExists) {
      toast.error('This mobile number is not registered. Please register first.');
      navigate('/register');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = userRole === 'admin' ?
        '/api/auth/verify-otp-phone' :
        '/api/auth/verify-otp-login';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile.trim(), otp: otp.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        const { user: userData } = data;

        if (userData.role === 'admin') {
          setStep(3);
          toast.success('Phone verified! Please enter your email and password.');
        } else {
          const { accessToken, refreshToken } = data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          const api = (await import('../../services/api')).default;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // Update the user context - this was missing!
          setUser(userData);

          toast.success('Login successful!');

          if (userData.role === 'merchant') {
            navigate('/merchant');
          } else {
            navigate('/');
          }
        }
      } else {
        throw new Error(data.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminEmailPasswordVerification = async () => {
    if (!validateEmailPassword()) return;

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password.trim());
      if (result.success) {
        toast.success('Admin authentication complete!');
      }
    } catch (error) {
      console.error('Admin email/password verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    if (step === 1) return 'Welcome Back';
    if (step === 2) return 'Verify Mobile';
    return 'Complete Authentication';
  };

  const getStepSubtitle = () => {
    if (step === 1) return 'Enter your mobile number to login';
    if (step === 2) return `Enter OTP sent to +91${mobile}`;
    return 'Enter your email and password to complete login';
  };

  const getStepIndicatorClass = (stepNumber) => {
    const baseClass = 'flex items-center justify-center w-8 h-8 rounded-full border-2';
    if (step >= stepNumber) {
      return `${baseClass} bg-primary-600 border-primary-600 text-white`;
    }
    return `${baseClass} border-gray-300 text-gray-300`;
  };

  const getProgressBarClass = (stepNumber) => {
    const baseClass = 'w-12 h-0.5';
    if (step >= stepNumber) {
      return `${baseClass} bg-primary-600`;
    }
    return `${baseClass} bg-gray-300`;
  };

  const getInputClass = (fieldName) => {
    const baseClass = 'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent';
    if (errors[fieldName]) {
      return `${baseClass} border-red-300`;
    }
    return `${baseClass} border-gray-300`;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      <div className={getStepIndicatorClass(1)}>
        <span className="text-sm font-medium">1</span>
      </div>
      <div className={getProgressBarClass(2)} />
      <div className={getStepIndicatorClass(2)}>
        <span className="text-sm font-medium">2</span>
      </div>
      {userRole === 'admin' && (
        <>
          <div className={getProgressBarClass(3)} />
          <div className={getStepIndicatorClass(3)}>
            <span className="text-sm font-medium">3</span>
          </div>
        </>
      )}
    </div>
  );

  const renderMobileStep = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Enter Mobile Number</h3>
      <div className="space-y-4">
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
            className={getInputClass('mobile')}
            placeholder="Enter your mobile number"
          />
          {errors.mobile && <p className="text-red-600 text-sm mt-1">{errors.mobile}</p>}
        </div>
        <button
          onClick={handleSendOTP}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <div className="loading-spinner"></div> : 'Send OTP'}
        </button>
      </div>
    </div>
  );

  const renderOTPStep = () => (
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
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
            Enter OTP
          </label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={4}
            className={`${getInputClass('otp')} text-center text-lg font-mono tracking-widest`}
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
          {isLoading ? <div className="loading-spinner"></div> : 'Verify & Login'}
        </button>
      </div>
    </div>
  );

  const renderEmailPasswordStep = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Complete Authentication</h3>
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
        <div className="flex items-center">
          <span className="text-green-600 mr-2">✅</span>
          <span className="text-green-800 text-sm">Phone verified! Please enter your email and password.</span>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={getInputClass('email')}
            placeholder="Enter your email address"
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={getInputClass('password')}
            placeholder="Enter your password"
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
        </div>
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(2)}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            ← Back to OTP
          </button>
        </div>
        <button
          onClick={handleAdminEmailPasswordVerification}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <div className="loading-spinner"></div> : 'Complete Login'}
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (step === 1) return renderMobileStep();
    if (step === 2) return renderOTPStep();
    return renderEmailPasswordStep();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">📱</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getStepSubtitle()}
          </p>
        </div>

        {renderStepIndicator()}
        {renderCurrentStep()}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;