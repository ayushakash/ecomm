import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../../components/ui';
import { colors, fonts, radii, spacing } from '../../../theme';

export const OTP_LENGTH = 6;

export interface OtpInputHandle {
  focus(): void;
  blur(): void;
}

interface OtpInputProps {
  value: string;
  onChange(next: string): void;
  /** Fires once all six digits are present. */
  onComplete?(code: string): void;
  error?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Six digit boxes driven by one hidden TextInput, so paste and OS one-time-code
 * autofill (iOS `oneTimeCode`, Android `sms-otp`) fill every box at once.
 * Shorter codes (4-digit dev OTP) remain submittable by the parent.
 */
export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, error, autoFocus, disabled },
  ref,
) {
  const { t } = useTranslation('auth');
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(digits);
    if (digits.length === OTP_LENGTH && digits !== value) onComplete?.(digits);
  };

  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.row}
        accessibilityRole="none"
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const digit = value[i] ?? '';
          const isActive = focused && i === activeIndex && !disabled;
          return (
            <View
              key={i}
              style={[
                styles.box,
                digit ? styles.boxFilled : null,
                isActive ? styles.boxActive : null,
                error ? styles.boxError : null,
              ]}
            >
              {digit ? (
                <Text variant="h1" style={styles.digit}>
                  {digit}
                </Text>
              ) : isActive ? (
                <View style={styles.caret} />
              ) : null}
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={OTP_LENGTH}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        accessibilityLabel={t('otp.a11yLabel')}
        accessibilityHint={t('otp.a11yHint', { count: OTP_LENGTH })}
        testID="otp-input"
      />
      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    aspectRatio: 0.86,
    maxHeight: 60,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  boxActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  boxError: { borderColor: colors.danger },
  digit: { fontFamily: fonts.bold },
  caret: { width: 2, height: 24, borderRadius: 1, backgroundColor: colors.primary },
  // Covers the boxes so long-press paste lands on the real input; visually invisible.
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.011,
    color: 'transparent',
    fontSize: 1,
  },
  error: { marginTop: spacing.sm },
});
