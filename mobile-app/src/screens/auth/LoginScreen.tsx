import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { THEME, SIZES } from '../../theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import CustomModal from '../../components/ui/CustomModal';

interface LoginScreenProps {
  navigation: any;
  route?: {
    params?: {
      redirectTo?: string;
      fromCheckout?: boolean;
    };
  };
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { loginWithOTP, sendOTP, login } = useAuth();
  const [step, setStep] = useState(1); // 1: Enter mobile, 2: Enter OTP, 3: Admin email/password
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ mobile?: string; otp?: string; email?: string; password?: string }>({});
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showOtpSentMessage, setShowOtpSentMessage] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    buttons: [] as Array<{ text: string; onPress: () => void; style?: 'primary' | 'secondary' | 'danger' }>
  });

  const validateMobile = () => {
    const newErrors: { mobile?: string } = {};

    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTP = () => {
    const newErrors: { otp?: string } = {};

    if (!otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (otp.trim() !== '1234') {
      newErrors.otp = 'Invalid OTP. Please enter 1234';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailPassword = () => {
    const newErrors: { email?: string; password?: string } = {};

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

    setLoading(true);
    try {
      const result = await sendOTP(mobile.trim());
      if (result.success) {
        setUserExists(result.userExists);
        // Note: We'll need to enhance the sendOTP API to return userRole
        setStep(2);
        setShowOtpSentMessage(true);

        // Auto hide message after 3 seconds
        setTimeout(() => {
          setShowOtpSentMessage(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setModalConfig({
        title: 'Oops! Something went wrong',
        message: 'Failed to send OTP. Please check your connection and try again.',
        type: 'error',
        buttons: [{ text: 'Try Again', onPress: () => setModalVisible(false) }]
      });
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return;

    if (!userExists) {
      // Redirect to registration
      setModalConfig({
        title: 'Account Not Found',
        message: 'This mobile number is not registered. Would you like to create a new account?',
        type: 'warning',
        buttons: [
          { text: 'Cancel', onPress: () => setModalVisible(false), style: 'secondary' },
          {
            text: 'Register',
            onPress: () => {
              setModalVisible(false);
              navigation.navigate('Register', route?.params);
            }
          }
        ]
      });
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithOTP(mobile.trim(), otp.trim());
      if (result.success) {
        // Check if user is admin to decide next step
        if (result.user?.role === 'admin') {
          // For admin users, move to step 3 for email/password verification
          setUserRole('admin');
          setStep(3);
          setModalConfig({
            title: 'Phone Verified! ✅',
            message: 'Please enter your email and password to complete admin authentication.',
            type: 'success',
            buttons: [{ text: 'Continue', onPress: () => setModalVisible(false) }]
          });
          setModalVisible(true);
        } else {
          // For non-admin users, complete login and directly navigate
          const fromCheckout = route?.params?.fromCheckout;

          if (result.user?.role === 'merchant') {
            // Redirect merchants to their orders page
            navigation.navigate('MerchantMain', { screen: 'Orders' });
          } else if (fromCheckout) {
            navigation.navigate('GuestMain', { screen: 'Cart' });
          } else {
            navigation.navigate('GuestMain', { screen: 'Home' });
          }
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminEmailPasswordVerification = async () => {
    if (!validateEmailPassword()) return;

    setLoading(true);
    try {
      const result = await login({ email: email.trim(), password: password.trim() });
      if (result.success) {
        setModalConfig({
          title: 'Admin Login Complete! 🎉',
          message: 'Authentication successful! Redirecting to admin panel...',
          type: 'success',
          buttons: [
            {
              text: 'Continue',
              onPress: () => {
                setModalVisible(false);
                // Navigate to admin panel - we'll need to handle this in the navigation
                navigation.navigate('AdminMain');
              }
            }
          ]
        });
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Admin email/password verification error:', error);
      setModalConfig({
        title: 'Authentication Failed',
        message: 'Invalid email or password. Please try again.',
        type: 'error',
        buttons: [{ text: 'Try Again', onPress: () => setModalVisible(false) }]
      });
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="call" size={40} color={THEME.primary} />
          </View>
          <Text style={styles.title}>
            {step === 1 ? 'Welcome Back' : step === 2 ? 'Verify Mobile' : 'Complete Authentication'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your mobile number to login'
              : step === 2
              ? `Enter OTP sent to +91${mobile}`
              : 'Enter your email and password to complete login'
            }
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
          </View>
          {userRole === 'admin' && (
            <>
              <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
              </View>
            </>
          )}
        </View>

        <Card style={styles.formCard}>
          {step === 1 ? (
            // Step 1: Enter Mobile Number
            <>
              <Input
                label="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                placeholder="Enter your mobile number"
                keyboardType="numeric"
                maxLength={10}
                error={errors.mobile}
                leftIcon="call-outline"
              />

              <Button
                title="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
                style={styles.loginButton}
              />
            </>
          ) : step === 2 ? (
            // Step 2: Enter OTP
            <>
              {showOtpSentMessage && (
                <View style={styles.otpSentMessage}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={THEME.success} />
                  <Text style={styles.otpSentText}>
                    OTP sent to +91{mobile} successfully! 📱
                  </Text>
                </View>
              )}

              <View style={styles.otpInfo}>
                <Ionicons name="information-circle-outline" size={20} color={THEME.info} />
                <Text style={styles.otpInfoText}>
                  For demo purposes, please enter: 1234
                </Text>
              </View>

              <Input
                label="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 4-digit OTP"
                keyboardType="numeric"
                maxLength={4}
                error={errors.otp}
                leftIcon="lock-closed-outline"
                textAlign="center"
                style={styles.otpInput}
              />

              <View style={styles.otpActions}>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={20} color={THEME.primary} />
                  <Text style={styles.backButtonText}>Change Number</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSendOTP}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendButtonText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Verify & Login"
                onPress={handleVerifyOTP}
                loading={loading}
                style={styles.loginButton}
              />
            </>
          ) : (
            // Step 3: Admin Email/Password
            <>
              <View style={styles.adminInfo}>
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME.success} />
                <Text style={styles.adminInfoText}>
                  Phone verified! Please enter your admin credentials.
                </Text>
              </View>

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon="mail-outline"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                error={errors.password}
                leftIcon="lock-closed-outline"
              />

              <View style={styles.adminActions}>
                <TouchableOpacity
                  onPress={() => setStep(2)}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={20} color={THEME.primary} />
                  <Text style={styles.backButtonText}>Back to OTP</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Complete Login"
                onPress={handleAdminEmailPasswordVerification}
                loading={loading}
                style={styles.loginButton}
              />
            </>
          )}
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
          >
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttons={modalConfig.buttons}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xl,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.textMuted,
  },
  stepDotTextActive: {
    color: THEME.background,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: THEME.border,
    marginHorizontal: SIZES.sm,
  },
  stepLineActive: {
    backgroundColor: THEME.primary,
  },
  formCard: {
    marginBottom: SIZES.xl,
  },
  otpSentMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.success + '15',
    padding: SIZES.md,
    borderRadius: SIZES.md,
    marginBottom: SIZES.md,
  },
  otpSentText: {
    fontSize: 14,
    color: THEME.success,
    marginLeft: SIZES.sm,
    flex: 1,
    fontWeight: '500',
  },
  otpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.info + '15',
    padding: SIZES.md,
    borderRadius: SIZES.md,
    marginBottom: SIZES.lg,
  },
  otpInfoText: {
    fontSize: 14,
    color: THEME.info,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SIZES.lg,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.success + '15',
    padding: SIZES.md,
    borderRadius: SIZES.md,
    marginBottom: SIZES.lg,
  },
  adminInfoText: {
    fontSize: 14,
    color: THEME.success,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginVertical: SIZES.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: THEME.primary,
    marginLeft: SIZES.xs,
    fontWeight: '500',
  },
  resendButton: {
    padding: SIZES.sm,
  },
  resendButtonText: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  loginButton: {
    marginTop: SIZES.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  signUpText: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;