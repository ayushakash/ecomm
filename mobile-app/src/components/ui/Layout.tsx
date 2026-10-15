import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, SCREEN_PADDING, shadows, spacing } from '../../theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';


export interface ScreenProps {
  children: React.ReactNode;
  /** Pad top by the status-bar inset (use when the screen has no ScreenHeader). */
  safeTop?: boolean;
  /** Pad bottom by the home-indicator inset (stack screens without a footer bar). */
  safeBottom?: boolean;
  /** Background (default theme background grey). */
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Screen root: flex 1 + background. Place ScreenHeader / FloatingCartBar inside. */
export function Screen({ children, safeTop = false, safeBottom = false, background = colors.background, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: background, paddingTop: safeTop ? insets.top : 0, paddingBottom: safeBottom ? insets.bottom : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Inner padding (default md). */
  padding?: number;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** White rounded surface for grouped content (cart summary, address rows, order cards). */
export function Card({ children, onPress, padding = spacing.md, elevated = false, style }: CardProps) {
  const base = [styles.card, { padding }, elevated && shadows.md, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && styles.pressed]} accessibilityRole="button">
      {children}
    </Pressable>
  );
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** "Shop by category        See all ›" row; horizontal padding = screen gutter. */
export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: SectionHeaderProps) {
  const { t } = useTranslation('common');
  return (
    <View style={[styles.section, style]}>
      <View style={styles.flex}>
        <Text variant="h2">{title}</Text>
        {subtitle && (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        )}
      </View>
      {onAction && (
        <Pressable onPress={onAction} hitSlop={10} style={styles.action} accessibilityRole="button">
          <Text variant="label" color="secondaryDark" weight="bold">
            {actionLabel ?? t('actions.seeAll')}
          </Text>
          <Icon name="chevron-forward" size={14} color="secondaryDark" />
        </Pressable>
      )}
    </View>
  );
}

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, { marginLeft: inset }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.9 },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
