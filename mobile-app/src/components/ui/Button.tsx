import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'whatsapp';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  /** primary = slate (default), secondary = amber CTA (ADD/Place order), outline, ghost, danger, success, whatsapp. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string; pressed: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, pressed: colors.primaryDark },
  secondary: { bg: colors.secondary, fg: colors.onSecondary, pressed: colors.secondaryDark },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong, pressed: colors.primarySoft },
  ghost: { bg: 'transparent', fg: colors.primary, pressed: colors.primarySoft },
  danger: { bg: colors.danger, fg: colors.textInverse, pressed: colors.dangerDark },
  success: { bg: colors.success, fg: colors.textInverse, pressed: colors.successDark },
  whatsapp: { bg: colors.whatsapp, fg: colors.textInverse, pressed: '#1DA851' },
};

const SIZES: Record<ButtonSize, { height: number; padH: number; icon: number; variant: 'label' | 'button' }> = {
  sm: { height: 36, padH: spacing.md, icon: 16, variant: 'label' },
  md: { height: 48, padH: spacing.lg, icon: 18, variant: 'button' },
  lg: { height: 54, padH: spacing.xl, icon: 20, variant: 'button' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.padH,
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? StyleSheet.hairlineWidth * 2 : 0,
        },
        fullWidth && styles.fullWidth,
        inactive && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {leftIcon && <Icon name={leftIcon} size={s.icon} color={v.fg} />}
          <Text variant={s.variant} style={{ color: v.fg }} numberOfLines={1}>
            {title}
          </Text>
          {rightIcon && <Icon name={rightIcon} size={s.icon} color={v.fg} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
});
