/**
 * Login modal. Port of client/src/pages/auth/Login.js:
 * WhatsApp OTP (phone → 6-digit code; first-time customers add their name and
 * register inline), Google sign-in when the native module is present, and the
 * optional phone link a Google account needs before checkout.
 */
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as RNImage,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Input, Screen, Text } from '../../components/ui';
import { WEBSITE_URL } from '../../config';
import i18n from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import { completeLogin } from '../../navigation/authRedirect';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, layout, radii, SCREEN_PADDING, shadows, spacing } from '../../theme';
import { toast } from '../../utils/toast';
import { openExternal } from '../../utils/whatsapp';
import { OTP_LENGTH, OtpInput, type OtpInputHandle } from './components/OtpInput';

const LOGO = require('../../../assets/logo.png');

const PHONE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{4,6}$/;
const RESEND_SECONDS = 30;

/** phone/otp = WhatsApp OTP login; linkPhone/linkOtp = after Google when the account has no phone. */
type Step = 'phone' | 'otp' | 'linkPhone' | 'linkOtp';

/** Values are auth-namespace translation keys, resolved at render. */
interface FieldErrors {
  phone?: string;
  otp?: string;
  name?: string;
}

const isRoleRejection = (message: string) => /merchant|admin/i.test(message);

function useResendTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);
  const restart = useCallback(() => setSecondsLeft(RESEND_SECONDS), []);
  const reset = useCallback(() => setSecondsLeft(0), []);
  return { secondsLeft, restart, reset };
}

function announceOtpSent(phone: string, devOtp?: string) {
  if (devOtp) toast.info(i18n.t('auth:otpSent'), i18n.t('auth:otpForTesting', { otp: devOtp }), 8000);
  else toast.success(i18n.t('auth:otpSent'), `+91 ${phone}`);
}

export default function LoginScreen({ navigation, route }: RootStackScreenProps<'Login'>) {
  const { t } = useTranslation('auth');
  const redirect = route.params?.redirect;
  const insets = useSafeAreaInsets();
  const { sendOtp, verifyOtp, loginWithGoogle, sendLinkPhoneOtp, linkPhone, isGoogleAvailable } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [rejection, setRejection] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const timer = useResendTimer();
  const otpRef = useRef<OtpInputHandle>(null);
  const nameRef = useRef<TextInput>(null);

  const isNewUser = step === 'otp' && userExists === false;
  const isOtpStep = step === 'otp' || step === 'linkOtp';
  const busy = sending || verifying || googleLoading;

  const finish = useCallback(() => {
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    completeLogin(navigation, redirect);
  }, [navigation, redirect]);

  const fail = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

  const validatePhone = (): boolean => {
    const value = phone.trim();
    const error = !value
      ? 'errors.phoneRequired'
      : !PHONE_REGEX.test(value)
        ? 'errors.phoneInvalid'
        : undefined;
    setErrors(error ? { phone: error } : {});
    return !error;
  };

  // ── Step 1: send OTP (login) or link-phone OTP (after Google) ────────────
  const handleSendOtp = async (target: 'otp' | 'linkOtp', isResend = false) => {
    if (!validatePhone()) return;
    Keyboard.dismiss();
    setRejection(null);
    setSending(true);
    try {
      if (target === 'otp') {
        const result = await sendOtp(phone);
        if (!result.success) {
          if (isRoleRejection(result.error)) setRejection(result.error);
          fail();
          return;
        }
        setUserExists(result.userExists);
        announceOtpSent(phone, result.devOtp);
      } else {
        const result = await sendLinkPhoneOtp(phone);
        if (!result.success) {
          fail();
          return;
        }
        announceOtpSent(phone, result.devOtp);
      }
      setOtp('');
      setErrors({});
      timer.restart();
      if (!isResend) setStep(target);
      else otpRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  // ── Step 2: verify ────────────────────────────────────────────────────────
  const handleVerify = async (code = otp) => {
    if (verifying) return;
    const next: FieldErrors = {};
    if (!code.trim()) next.otp = 'errors.otpRequired';
    else if (!OTP_REGEX.test(code.trim())) next.otp = 'errors.otpInvalid';
    if (isNewUser && name.trim().length < 2) next.name = 'errors.nameShort';
    setErrors(next);
    if (next.name) {
      nameRef.current?.focus();
      return;
    }
    if (next.otp) return;

    Keyboard.dismiss();
    setVerifying(true);
    try {
      if (step === 'linkOtp') {
        const result = await linkPhone(phone, code);
        if (result.success) finish();
        else {
          setOtp('');
          fail();
        }
        return;
      }
      const result = await verifyOtp({ phone, otp: code, name: name.trim(), userExists: userExists !== false });
      if (result.success) {
        finish();
        return;
      }
      fail();
      if (isRoleRejection(result.error)) {
        setRejection(result.error);
        setStep('phone');
      } else {
        setOtp('');
        otpRef.current?.focus();
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpComplete = (code: string) => {
    // Auto-submit on the 6th digit unless a new customer still needs to type a name.
    if (isNewUser && name.trim().length < 2) {
      nameRef.current?.focus();
      return;
    }
    void handleVerify(code);
  };

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setRejection(null);
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        if (isRoleRejection(result.error)) setRejection(result.error);
        fail();
        return;
      }
      if ('cancelled' in result) return;
      if (result.phoneRequired) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setPhone('');
        setOtp('');
        setErrors({});
        timer.reset();
        setStep('linkPhone');
        return;
      }
      finish();
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Navigation within the modal ──────────────────────────────────────────
  const goBackStep = () => {
    setErrors({});
    setOtp('');
    timer.reset();
    setStep(step === 'linkOtp' ? 'linkPhone' : 'phone');
  };

  const close = () => {
    Keyboard.dismiss();
    // After Google with a missing phone the user is already signed in: skipping
    // still honours the redirect (checkout asks for the phone again, like web).
    if (step === 'linkPhone' || step === 'linkOtp') completeLogin(navigation, redirect);
    else navigation.goBack();
  };

  useEffect(() => {
    if (isNewUser) {
      const id = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(id);
    }
  }, [isNewUser]);

  // ── Copy ─────────────────────────────────────────────────────────────────
  const title =
    step === 'phone'
      ? t('title.phone')
      : step === 'linkPhone'
        ? t('title.linkPhone')
        : isNewUser
          ? t('title.newUser')
          : t('title.verify');

  const subtitle =
    step === 'phone'
      ? t('subtitle.phone')
      : step === 'linkPhone'
        ? t('subtitle.linkPhone')
        : isNewUser
          ? t('subtitle.newUser')
          : t('subtitle.verify');

  const verifyLabel = step === 'linkOtp' ? t('verify.link') : isNewUser ? t('verify.create') : t('verify.login');

  return (
    <Screen background={colors.surface}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        {isOtpStep ? (
          <Pressable
            onPress={goBackStep}
            hitSlop={layout.hitSlop}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('changeNumber')}
          >
            <Icon name="arrow-back" size={22} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        {step === 'linkPhone' || step === 'linkOtp' ? (
          <Pressable
            onPress={close}
            hitSlop={layout.hitSlop}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel={t('skipA11y')}
          >
            <Text variant="label" color="textSecondary">
              {t('skip')}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={close}
            hitSlop={layout.hitSlop}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Icon name="close" size={24} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
            <View style={styles.logoWrap}>
              <RNImage source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Chardeevari" />
            </View>
          </Animated.View>

          <Animated.View key={step} entering={FadeInDown.duration(280)}>
            <Text variant="display" style={styles.title}>
              {title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.subtitle}>
              {subtitle}
            </Text>

            {rejection && (step === 'phone' || step === 'linkPhone') ? (
              <View style={styles.rejection}>
                <Icon name="storefront-outline" size={20} color="danger" />
                <View style={styles.flex}>
                  <Text variant="label" color="dangerDark">
                    {t('rejection.title')}
                  </Text>
                  <Text variant="bodySm" color="textSecondary" style={styles.rejectionText}>
                    {rejection}
                  </Text>
                  <Pressable
                    onPress={() => openExternal(WEBSITE_URL)}
                    accessibilityRole="link"
                    accessibilityLabel={t('rejection.openSite')}
                    hitSlop={layout.hitSlop}
                  >
                    <Text variant="label" color="primary" style={styles.underline}>
                      {t('rejection.openSite')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {step === 'phone' || step === 'linkPhone' ? (
              <View style={styles.form}>
                <Input
                  label={t('phone.label')}
                  prefix="+91"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/\D/g, '').slice(0, 10));
                    if (errors.phone) setErrors({});
                    if (rejection) setRejection(null);
                  }}
                  placeholder={t('phone.placeholder')}
                  keyboardType="phone-pad"
                  inputMode="tel"
                  textContentType="telephoneNumber"
                  autoComplete="tel-national"
                  maxLength={10}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => handleSendOtp(step === 'phone' ? 'otp' : 'linkOtp')}
                  error={errors.phone && t(errors.phone)}
                  hint={t('phone.hint')}
                  right={
                    PHONE_REGEX.test(phone) ? <Icon name="checkmark-circle" size={20} color="success" /> : undefined
                  }
                  accessibilityLabel={t('phone.label')}
                />
                <Button
                  title={t('phone.send')}
                  variant="whatsapp"
                  size="lg"
                  leftIcon="logo-whatsapp"
                  fullWidth
                  loading={sending}
                  disabled={busy || phone.length !== 10}
                  onPress={() => handleSendOtp(step === 'phone' ? 'otp' : 'linkOtp')}
                  testID="send-otp"
                />

                {step === 'phone' && isGoogleAvailable ? (
                  <>
                    <View style={styles.orRow}>
                      <View style={styles.orLine} />
                      <Text variant="caption" color="textMuted">
                        {t('orContinue')}
                      </Text>
                      <View style={styles.orLine} />
                    </View>
                    <Button
                      title={t('google')}
                      variant="outline"
                      size="lg"
                      leftIcon="logo-google"
                      fullWidth
                      loading={googleLoading}
                      disabled={busy}
                      onPress={handleGoogle}
                      testID="google-login"
                    />
                  </>
                ) : null}
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.phoneRow}>
                  <Icon name="logo-whatsapp" size={18} color="whatsapp" />
                  <Text variant="title" style={styles.flex}>
                    +91 {phone}
                  </Text>
                  <Pressable
                    onPress={goBackStep}
                    hitSlop={layout.hitSlop}
                    accessibilityRole="button"
                    accessibilityLabel={t('changeNumber')}
                  >
                    <Text variant="label" color="primary" style={styles.underline}>
                      {t('change')}
                    </Text>
                  </Pressable>
                </View>

                {isNewUser ? (
                  <Input
                    ref={nameRef}
                    label={t('name.label')}
                    leftIcon="person-outline"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                    }}
                    placeholder={t('name.placeholder')}
                    textContentType="name"
                    autoComplete="name"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => otpRef.current?.focus()}
                    error={errors.name && t(errors.name)}
                    accessibilityLabel={t('name.label')}
                  />
                ) : null}

                <View>
                  <Text variant="label" color="textSecondary" style={styles.otpLabel}>
                    {t('otp.label')}
                  </Text>
                  <OtpInput
                    ref={otpRef}
                    value={otp}
                    onChange={(next) => {
                      setOtp(next);
                      if (errors.otp) setErrors((e) => ({ ...e, otp: undefined }));
                    }}
                    onComplete={handleOtpComplete}
                    error={errors.otp && t(errors.otp)}
                    autoFocus={!isNewUser}
                    disabled={verifying}
                  />
                </View>

                <View style={styles.resendRow}>
                  <Text variant="bodySm" color="textSecondary">
                    {t('otp.noCode')}
                  </Text>
                  {timer.secondsLeft > 0 ? (
                    <Text variant="bodySm" color="textMuted">
                      {t('otp.resendIn', { time: `0:${String(timer.secondsLeft).padStart(2, '0')}` })}
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => handleSendOtp(step === 'linkOtp' ? 'linkOtp' : 'otp', true)}
                      disabled={sending}
                      hitSlop={layout.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={t('otp.resend')}
                    >
                      <Text variant="label" color={sending ? 'textMuted' : 'primary'} style={styles.underline}>
                        {sending ? t('otp.sending') : t('otp.resend')}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Button
                  title={verifyLabel}
                  size="lg"
                  fullWidth
                  loading={verifying}
                  disabled={busy || otp.length < 4}
                  onPress={() => handleVerify()}
                  testID="verify-otp"
                />
              </View>
            )}
          </Animated.View>

          <View style={styles.footer}>
            <View style={styles.trustRow}>
              <Icon name="shield-checkmark-outline" size={16} color="success" />
              <Text variant="caption" color="textSecondary">
                {t('secure')}
              </Text>
            </View>
            {step === 'phone' ? (
              <Text variant="caption" color="textMuted" align="center">
                {t('sell')}{' '}
                <Text
                  variant="caption"
                  color="primary"
                  weight="semibold"
                  style={styles.underline}
                  onPress={() => openExternal(`${WEBSITE_URL}/merchant-register`)}
                  accessibilityRole="link"
                >
                  {t('merchantSignup')}
                </Text>
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iconButton: {
    width: layout.touchMin,
    height: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  skip: { minHeight: layout.touchMin, justifyContent: 'center', paddingHorizontal: spacing.md },
  content: { paddingHorizontal: SCREEN_PADDING + spacing.xs, flexGrow: 1 },
  hero: { alignItems: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.xxl },
  logoWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.brandSoft,
    ...shadows.sm,
  },
  logo: { width: 128, height: 71 },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
  rejection: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.lg,
  },
  rejectionText: { marginTop: spacing.xxs, marginBottom: spacing.sm },
  underline: { textDecorationLine: 'underline' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpLabel: { marginBottom: spacing.sm },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { marginTop: 'auto', paddingTop: spacing.xxxl, gap: spacing.md, alignItems: 'center' },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
