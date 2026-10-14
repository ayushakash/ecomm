import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Input, Text } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { colors, radii, spacing } from '../../../theme';
import { toast } from '../../../utils/toast';

const PHONE_RE = /^[6-9]\d{9}$/;
const OTP_RE = /^\d{4,6}$/;

export interface LinkPhoneSheetProps {
  visible: boolean;
  onClose(): void;
}

/** Web Checkout "Verify Your Phone Number" modal for Google-auth users without a phone. */
export function LinkPhoneSheet({ visible, onClose }: LinkPhoneSheetProps) {
  const { sendLinkPhoneOtp, linkPhone } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!PHONE_RE.test(phone.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    const result = await sendLinkPhoneOtp(phone.trim());
    setLoading(false);
    if (!result.success) return;
    setStep(2);
    toast.success('OTP sent to your WhatsApp', `+91 ${phone.trim()}`);
    if (result.devOtp) {
      setDevOtp(result.devOtp);
      toast.info(`OTP: ${result.devOtp}`);
    }
  };

  const verifyOtp = async () => {
    if (!OTP_RE.test(otp.trim())) {
      setError('Please enter a valid OTP');
      return;
    }
    setError('');
    setLoading(true);
    const result = await linkPhone(phone.trim(), otp.trim());
    setLoading(false);
    if (!result.success) return;
    setStep(1);
    setPhone('');
    setOtp('');
    setDevOtp('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Verify your phone number"
      subtitle="A verified phone number is required to place orders so we can contact you about your delivery."
      footer={
        <Button
          title={step === 1 ? 'Send OTP' : 'Verify & continue'}
          variant="secondary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={step === 1 ? sendOtp : verifyOtp}
        />
      }
    >
      {step === 1 ? (
        <Input
          label="Mobile number"
          prefix="+91"
          value={phone}
          onChangeText={(text) => {
            setPhone(text.replace(/\D/g, ''));
            setError('');
          }}
          maxLength={10}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          error={error || null}
          autoFocus
        />
      ) : (
        <View style={styles.otpStep}>
          <Text variant="bodySm" color="textSecondary">
            Enter the OTP sent to <Text variant="bodySm" weight="bold">+91 {phone}</Text> on WhatsApp.
          </Text>
          {!!devOtp && (
            <View style={styles.devOtp}>
              <Text variant="bodySm">
                Dev OTP: <Text variant="bodySm" weight="bold">{devOtp}</Text>
              </Text>
            </View>
          )}
          <Input
            label="OTP"
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/\D/g, ''));
              setError('');
            }}
            maxLength={6}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            placeholder="Enter OTP"
            error={error || null}
            autoFocus
          />
          <View style={styles.links}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setStep(1);
                setOtp('');
                setError('');
              }}
            >
              <Text variant="label" color="primary" weight="semibold">Change number</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} disabled={loading} onPress={sendOtp}>
              <Text variant="label" color="primary" weight="semibold">Resend OTP</Text>
            </Pressable>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  otpStep: { gap: spacing.md },
  devOtp: { backgroundColor: colors.warningSoft, borderRadius: radii.sm, padding: spacing.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
});
