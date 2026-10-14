import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Button, type ButtonVariant } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Fill available space and center (default true). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = 'cube-outline',
  title,
  message,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  secondaryLabel,
  onSecondary,
  fill = true,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, fill && styles.fill, style]}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={36} color="primaryLight" />
      </View>
      <Text variant="h2" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="body" color="textSecondary" align="center" style={styles.message}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant={actionVariant} style={styles.action} />
      )}
      {secondaryLabel && onSecondary && (
        <Button title={secondaryLabel} onPress={onSecondary} variant="ghost" size="sm" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  fill: { flex: 1, justifyContent: 'center' },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  message: { maxWidth: 300 },
  action: { marginTop: spacing.md, minWidth: 180 },
});
