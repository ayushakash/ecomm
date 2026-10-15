import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation('auth');
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userExists, setUserExists] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const { login, setUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const validateMobile = () => {
    const newErrors = {};
    if (!mobile.trim()) {
      newErrors.mobile = t('validation.mobileRequired');
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      newErrors.mobile = t('validation.mobileInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTP = () => {
    const newErrors = {};
    if (!otp.trim()) {
      newErrors.otp = t('validation.otpRequired');
    } else if (!/^\d{4,6}$/.test(otp.trim())) {
      newErrors.otp = t('validation.otpInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailPassword = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = t('validation.emailInvalid');
    }
    if (!password.trim()) {
      newErrors.password = t('validation.passwordRequired');
    } else if (password.trim().length < 6) {
      newErrors.password = t('validation.passwordMin');
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

      if (!response.ok) {
        throw new Error(data.message || t('toast.sendOtpFailed'));
      }

      setUserExists(data.userExists);
      if (data.userExists && data.userRole) {
        setUserRole(data.userRole);
      }

      setStep(2);

      // In development, show OTP in toast for easy testing
      if (data.otp) {
        toast.success(t('toast.otpSentTesting', { mobile, otp: data.otp }));
        console.log('📱 OTP for testing:', data.otp);
      } else {
        toast.success(t('toast.otpSentTo', { mobile }));
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error(error.message || t('toast.sendOtpRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return;

    // First-time user: complete registration INLINE using the OTP that was
    // already sent during send-otp. Avoids bouncing to /register and sending a
    // second OTP — the customer just adds their name and is logged straight in.
    if (!userExists) {
      if (!name.trim() || name.trim().length < 2) {
        setErrors((prev) => ({ ...prev, name: t('validation.nameMinInline') }));
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/verify-otp-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), phone: mobile.trim(), otp: otp.trim() })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.errors?.[0]?.msg || t('toast.registrationFailed'));
        }

        const { user: userData, accessToken, refreshToken } = data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        const api = (await import('../../services/api')).default;
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        setUser(userData);
        toast.success(t('toast.accountCreated'));
        navigate(from || '/');
      } catch (error) {
        console.error('Inline registration error:', error);
        toast.error(error.message || t('toast.registrationRetry'));
      } finally {
        setIsLoading(false);
      }
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
          toast.success(t('admin.phoneVerified'));
        } else {
          const { accessToken, refreshToken } = data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          const api = (await import('../../services/api')).default;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          setUser(userData);

          toast.success(t('toast.loginSuccess'));

          if (userData.role === 'merchant') {
            navigate('/merchant');
          } else {
            navigate(from || '/');
          }
        }
      } else {
        throw new Error(data.message || t('toast.otpVerifyFailed'));
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
        toast.success(t('admin.complete'));
      }
    } catch (error) {
      console.error('Admin email/password verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    if (step === 1) return t('login.steps.welcome');
    if (step === 2) return t('login.steps.verify');
    return t('admin.title');
  };

  const getStepSubtitle = () => {
    if (step === 1) return t('login.steps.welcomeSub');
    if (step === 2) return t('login.steps.verifySub', { mobile });
    return t('admin.subtitle');
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
      <h3 className="text-lg font-medium text-gray-900 mb-6">{t('login.withWhatsapp')}</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="mobile" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {t('fields.whatsappNumber')}
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm select-none">+91</span>
            <input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={10}
              className={`flex-1 px-3 py-2 border rounded-r-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.mobile ? 'border-red-300' : 'border-gray-300'}`}
              placeholder={t('fields.whatsappPlaceholder')}
            />
          </div>
          {errors.mobile
            ? <p className="text-red-600 text-xs mt-1">{errors.mobile}</p>
            : <p className="text-xs text-gray-400 mt-1">{t('fields.whatsappHint')}</p>
          }
        </div>
        <button
          onClick={handleSendOTP}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#25D366] hover:bg-[#1ebe57] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <div className="loading-spinner"></div> : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t('sendOtp')}
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderOTPStep = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        {userExists === false ? t('login.createAccount') : t('verifyMobileNumber')}
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        {userExists === false
          ? t('login.newUserHint', { mobile })
          : t('otpSentHint', { mobile })}
      </p>
      <div className="space-y-4">
        {userExists === false && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.yourName')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={getInputClass('name')}
              placeholder={t('fields.namePlaceholder')}
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>
        )}
        <div>
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.otp')}
          </label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            className={`${getInputClass('otp')} text-center text-lg font-mono tracking-widest`}
            placeholder={t('fields.otp')}
          />
          {errors.otp && <p className="text-red-600 text-sm mt-1">{errors.otp}</p>}
        </div>
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            ← {t('changeNumber')}
          </button>
          <button
            onClick={handleSendOTP}
            className="text-sm text-primary-600 hover:text-primary-500 underline"
          >
            {t('resendOtp')}
          </button>
        </div>
        <button
          onClick={handleVerifyOTP}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <div className="loading-spinner"></div> : (userExists === false ? t('login.createAndLogin') : t('login.verifyAndLogin'))}
        </button>
      </div>
    </div>
  );

  const renderEmailPasswordStep = () => (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">{t('admin.title')}</h3>
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
        <div className="flex items-center">
          <span className="text-green-600 mr-2">✅</span>
          <span className="text-green-800 text-sm">{t('admin.phoneVerified')}</span>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={getInputClass('email')}
            placeholder={t('fields.emailPlaceholder')}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={getInputClass('password')}
            placeholder={t('fields.passwordPlaceholder')}
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
        </div>
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(2)}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            ← {t('admin.backToOtp')}
          </button>
        </div>
        <button
          onClick={handleAdminEmailPasswordVerification}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <div className="loading-spinner"></div> : t('admin.completeLogin')}
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

        {step === 1 && (
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">{t('login.orContinueWith')}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  loginWithGoogle(credentialResponse.credential);
                }}
                onError={() => {
                  toast.error(t('toast.googleSignInFailed'));
                }}
                width="360"
                text="signin_with"
                shape="rectangular"
              />
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {t('login.signUpHere')}
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            {t('sellPrompt')}{' '}
            <Link
              to="/merchant-register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {t('merchantSignUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const LoginWithGoogle = () => (
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
    <Login />
  </GoogleOAuthProvider>
);

export default LoginWithGoogle;