import React from 'react';
import { StyleSheet, View } from 'react-native';
import Toast, { type ToastConfig, type ToastConfigParams } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const KINDS: Record<'success' | 'error' | 'info', { icon: IconName; accent: string }> = {
  success: { icon: 'checkmark-circle', accent: colors.success },
  error: { icon: 'alert-circle', accent: colors.danger },
  info: { icon: 'information-circle', accent: colors.secondary },
};

function ToastCard({ kind, text1, text2 }: ToastConfigParams<unknown> & { kind: keyof typeof KINDS }) {
  const k = KINDS[kind];
  return (
    <View style={styles.card}>
      <Icon name={k.icon} size={22} color={k.accent} />
      <View style={styles.flex}>
        {!!text1 && (
          <Text variant="label" weight="bold" style={{ color: colors.textInverse }} numberOfLines={2}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={3}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
}

const config: ToastConfig = {
  success: (p) => <ToastCard kind="success" {...p} />,
  error: (p) => <ToastCard kind="error" {...p} />,
  info: (p) => <ToastCard kind="info" {...p} />,
};

/** Mount once at the app root (after navigation) — see utils/toast.ts for the API. */
export function AppToast() {
  const insets = useSafeAreaInsets();
  return <Toast config={config} position="top" topOffset={insets.top + spacing.sm} visibilityTime={3000} />;
}

const styles = StyleSheet.create({
  card: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryDark,
    ...shadows.lg,
  },
  flex: { flex: 1, gap: 2 },
});
