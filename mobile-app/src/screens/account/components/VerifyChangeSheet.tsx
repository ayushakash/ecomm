import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Input, Text } from '../../../components/ui';
import { spacing } from '../../../theme';
import { toast } from '../../../utils/toast';

type Kind = 'phone' | 'email';

interface Props {
  kind: Kind | null;
  initialValue?: string;
  onClose(): void;
  sendOtp(value: string): Promise<{ success: true; devOtp?: string } | { success: false; error: string }>;
  verify(value: string, otp: string): Promise<{ success: boolean }>;
}

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Two-step "enter value → enter OTP" sheet used to link a phone or change email (web Profile.js OTP flow). */
export function VerifyChangeSheet({ kind, initialValue = '', onClose, sendOtp, verify }: Props) {
  const { t } = useTranslation('account');
  const [value, setValue] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kind) {
      setValue(initialValue);
      setOtp('');
      setPending(null);
      setError(null);
    }
  }, [kind, initialValue]);

  const isPhone = kind === 'phone';

  const handleSend = async (target = value.trim()) => {
    if (isPhone ? !PHONE_RE.test(target) : !EMAIL_RE.test(target)) {
      setError(isPhone ? 'verify.phoneInvalid' : 'verify.emailInvalid');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await sendOtp(target);
    setBusy(false);
    if (res.success) {
      setPending(target);
      setOtp('');
      if (res.devOtp) toast.info(t('verify.devOtp', { otp: res.devOtp }));
    }
  };

  const handleVerify = async () => {
    if (!pending || otp.length !== 6) return;
    setBusy(true);
    const res = await verify(pending, otp);
    setBusy(false);
    if (res.success) onClose();
  };

  const title = isPhone ? t('verify.linkPhoneTitle') : t('verify.changeEmailTitle');
  const subtitle = pending
    ? isPhone
      ? t('verify.sentPhone', { phone: pending })
      : t('verify.sentEmail', { email: pending })
    : isPhone
      ? t('verify.phoneSub')
      : t('verify.emailSub');

  return (
    <BottomSheet
      visible={kind !== null}
      onClose={onClose}
      title={pending ? (isPhone ? t('verify.verifyPhone') : t('verify.verifyEmail')) : title}
      subtitle={subtitle}
      footer={
        pending ? (
          <Button title={t('verify.verify')} fullWidth loading={busy} disabled={otp.length !== 6} onPress={handleVerify} />
        ) : (
          <Button title={t('verify.sendOtp')} fullWidth loading={busy} onPress={() => handleSend()} />
        )
      }
    >
      {pending ? (
        <View style={styles.gap}>
          <Input
            label={t('verify.code')}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder={t('verify.codePlaceholder')}
            autoFocus
          />
          <View style={styles.row}>
            <Button title={t('profile.change')} variant="ghost" size="sm" onPress={() => setPending(null)} />
            <Button title={t('verify.resend')} variant="ghost" size="sm" disabled={busy} onPress={() => handleSend(pending)} />
          </View>
        </View>
      ) : (
        <View style={styles.gap}>
          <Input
            label={isPhone ? t('verify.mobileLabel') : t('verify.emailLabel')}
            value={value}
            onChangeText={(text) => setValue(isPhone ? text.replace(/\D/g, '').slice(0, 10) : text)}
            prefix={isPhone ? '+91' : undefined}
            keyboardType={isPhone ? 'phone-pad' : 'email-address'}
            autoCapitalize="none"
            autoComplete={isPhone ? 'tel' : 'email'}
            error={error && t(error)}
            autoFocus
          />
          <Text variant="caption" color="textMuted">
            {isPhone ? t('verify.phoneNote') : t('verify.emailNote')}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
