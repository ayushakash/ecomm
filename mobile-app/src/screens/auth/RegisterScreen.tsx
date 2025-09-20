import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

interface RegisterScreenProps {
  navigation: any;
  route?: {
    params?: {
      redirectTo?: string;
      fromCheckout?: boolean;
    };
  };
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  const { registerWithOTP } = useAuth();
  const [step, setStep] = useState(1); // 1: Enter details, 2: Verify OTP
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; mobile?: string; otp?: string }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    buttons: [] as Array<{ text: string; onPress: () => void; style?: 'primary' | 'secondary' | 'danger' }>
  });

  const validateStep1 = () => {
    const newErrors: { name?: string; mobile?: string } = {};

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
    const newErrors: { otp?: string } = {};

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

    setLoading(true);
    try {
      // Simulate API call to send OTP
      await new Promise(resolve => setTimeout(resolve, 1000));

      setModalConfig({
        title: 'OTP Sent! 📱',
        message: `OTP has been sent to +91${mobile}.\n\nFor demo purposes, please enter: 1234`,
        type: 'success',
        buttons: [{
          text: 'Got it!',
          onPress: () => {
            setModalVisible(false);
            setStep(2);
          }
        }]
      });
      setModalVisible(true);
    } catch (error) {
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
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const result = await registerWithOTP(name.trim(), mobile.trim(), otp.trim());
      if (result.success) {
        const fromCheckout = route?.params?.fromCheckout;

        setModalConfig({
          title: 'Welcome to the family! 🎉',
          message: 'Your account has been created successfully! Get ready to start shopping.',
          type: 'success',
          buttons: [{
            text: 'Let\'s go!',
            onPress: () => {
              setModalVisible(false);
              if (fromCheckout) {
                // If coming from checkout, redirect to Cart tab
                navigation.navigate('GuestMain', { screen: 'Cart' });
              } else {
                // Normal registration, redirect to Home tab
                navigation.navigate('GuestMain', { screen: 'Home' });
              }
            }
          }]
        });
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setModalConfig({
        title: 'Registration Failed',
        message: 'We couldn\'t create your account. Please check your details and try again.',
        type: 'error',
        buttons: [{ text: 'Try Again', onPress: () => setModalVisible(false) }]
      });
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card style={styles.formCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Enter Your Details</Text>
        <Text style={styles.stepSubtitle}>We'll send you an OTP to verify your mobile number</Text>
      </View>

      <Input
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
        error={errors.name}
        leftIcon="person-outline"
      />

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
        style={styles.sendOtpButton}
      />
    </Card>
  );

  const renderStep2 = () => (
    <Card style={styles.formCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Verify Mobile Number</Text>
        <Text style={styles.stepSubtitle}>
          Enter the 4-digit OTP sent to +91{mobile}
        </Text>
      </View>

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
        title="Verify & Register"
        onPress={handleVerifyOTP}
        loading={loading}
        style={styles.verifyButton}
      />
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="person-add" size={40} color={THEME.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Quick registration with mobile verification</Text>
        </View>

        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
          </View>
        </View>

        {step === 1 ? renderStep1() : renderStep2()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
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
    marginBottom: SIZES.lg,
  },
  stepHeader: {
    marginBottom: SIZES.lg,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.sm,
  },
  stepSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sendOtpButton: {
    marginTop: SIZES.md,
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
  verifyButton: {
    marginTop: SIZES.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  footerText: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  signInText: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;