import React, { useEffect, useState } from 'react';
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
      setError(isPhone ? 'Enter a valid 10-digit mobile number' : 'Enter a valid email address');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await sendOtp(target);
    setBusy(false);
    if (res.success) {
      setPending(target);
      setOtp('');
      if (res.devOtp) toast.info('OTP: ' + res.devOtp);
    }
  };

  const handleVerify = async () => {
    if (!pending || otp.length !== 6) return;
    setBusy(true);
    const res = await verify(pending, otp);
    setBusy(false);
    if (res.success) onClose();
  };

  const title = isPhone ? 'Link phone number' : 'Change email';
  const subtitle = pending
    ? `We sent a 6-digit code to ${isPhone ? 'your WhatsApp on +91 ' + pending : pending}`
    : isPhone
      ? 'We will verify it with an OTP on WhatsApp'
      : 'We will send a verification code to the new email';

  return (
    <BottomSheet
      visible={kind !== null}
      onClose={onClose}
      title={pending ? (isPhone ? 'Verify phone number' : 'Verify email address') : title}
      subtitle={subtitle}
      footer={
        pending ? (
          <Button title="Verify" fullWidth loading={busy} disabled={otp.length !== 6} onPress={handleVerify} />
        ) : (
          <Button title="Send OTP" fullWidth loading={busy} onPress={() => handleSend()} />
        )
      }
    >
      {pending ? (
        <View style={styles.gap}>
          <Input
            label="Verification code"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="Enter 6-digit code"
            autoFocus
          />
          <View style={styles.row}>
            <Button title="Change" variant="ghost" size="sm" onPress={() => setPending(null)} />
            <Button title="Resend code" variant="ghost" size="sm" disabled={busy} onPress={() => handleSend(pending)} />
          </View>
        </View>
      ) : (
        <View style={styles.gap}>
          <Input
            label={isPhone ? 'Mobile number' : 'Email address'}
            value={value}
            onChangeText={(t) => setValue(isPhone ? t.replace(/\D/g, '').slice(0, 10) : t)}
            prefix={isPhone ? '+91' : undefined}
            keyboardType={isPhone ? 'phone-pad' : 'email-address'}
            autoCapitalize="none"
            autoComplete={isPhone ? 'tel' : 'email'}
            error={error}
            autoFocus
          />
          <Text variant="caption" color="textMuted">
            {isPhone ? 'Required for placing orders and delivery updates.' : 'Used for order receipts.'}
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
