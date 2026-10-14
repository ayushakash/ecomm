import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar } from '../FocusAwareStatusBar';
import { colors, layout, palette, spacing } from '../../theme';
import { CountBubble } from './Badge';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface HeaderAction {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  /** Small count bubble on the icon. */
  badge?: number;
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Back button: true = navigation.goBack() (default on stack screens), false = hidden, function = custom. */
  back?: boolean | (() => void);
  /** 'close' icon instead of back arrow (modals). */
  backIcon?: 'back' | 'close';
  actions?: HeaderAction[];
  /** Custom right-side node (replaces actions). */
  right?: React.ReactNode;
  /** Pad for the status bar (default true; false inside modals/sheets that already do). */
  safeTop?: boolean;
  /** Single-row bar for detail pages (product, map, invoice) where content should start high. */
  compact?: boolean;
  /** Large faint watermark glyph on the right of the large header. */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

const GRADIENT = ['#1E2A3A', '#2C3E57'] as const;
const CURVE = 28;

/**
 * Brand top bar used by every screen except Home (native headers are disabled).
 * Default: large-title header with a curved bottom (Zepto / Instamart style).
 * `compact`: one-row bar with the title beside the back button.
 */
export function ScreenHeader({
  title,
  subtitle,
  back,
  backIcon = 'back',
  actions,
  right,
  safeTop = true,
  compact = false,
  icon,
  style,
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // Tab roots never get a back arrow (canGoBack is true there because of tab history).
  const showBack =
    back === undefined ? navigation.getState()?.type !== 'tab' && navigation.canGoBack() : back !== false;
  const onBack = typeof back === 'function' ? back : () => navigation.goBack();

  const backButton = showBack && (
    <Pressable
      onPress={onBack}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={backIcon === 'close' ? 'Close' : 'Go back'}
    >
      <Icon name={backIcon === 'close' ? 'close' : 'arrow-back'} size={20} color="onPrimary" />
    </Pressable>
  );

  const actionNodes =
    right ??
    actions?.map((a) => (
      <Pressable
        key={a.accessibilityLabel}
        onPress={a.onPress}
        hitSlop={layout.hitSlop}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={a.accessibilityLabel}
      >
        <Icon name={a.icon} size={20} color="onPrimary" />
        <CountBubble count={a.badge ?? 0} style={styles.dot} />
      </Pressable>
    ));
  const hasActions = !!right || !!actions?.length;

  const background = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.ringOuter} />
      <View pointerEvents="none" style={styles.ringInner} />
    </>
  );

  if (compact) {
    return (
      <View style={[styles.wrap, styles.curveSm, { paddingTop: safeTop ? insets.top : 0 }, style]}>
        <FocusAwareStatusBar style="light" />
        {background}
        <View style={styles.compactBar}>
          {backButton}
          <View style={[styles.flex, !showBack && styles.titleInset]}>
            <Text variant="h3" weight="extrabold" color="onPrimary" numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text variant="caption" color={palette.slate300} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {actionNodes}
        </View>
      </View>
    );
  }

  const titleBlock = (
    <View style={styles.flex}>
      <View style={styles.accent} />
      <Text variant="h1" color="onPrimary" numberOfLines={1}>
        {title}
      </Text>
      {!!subtitle && (
        <Text variant="bodySm" color={palette.slate300} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.wrap, styles.curve, { paddingTop: safeTop ? insets.top : 0 }, style]}>
      <FocusAwareStatusBar style="light" />
      {background}
      {!!icon && (
        <View pointerEvents="none" style={[styles.watermark, hasActions && !showBack && styles.watermarkShifted]}>
          <Icon name={icon} size={96} color={palette.white} />
        </View>
      )}
      {showBack ? (
        <>
          <View style={styles.topRow}>
            {backButton}
            <View style={styles.flex} />
            {actionNodes}
          </View>
          <View style={styles.largeBody}>{titleBlock}</View>
        </>
      ) : (
        <View style={[styles.largeBody, styles.largeBodyRoot]}>
          {titleBlock}
          {hasActions && <View style={styles.inlineActions}>{actionNodes}</View>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { overflow: 'hidden', zIndex: 2, backgroundColor: GRADIENT[0] },
  curve: { borderBottomLeftRadius: CURVE, borderBottomRightRadius: CURVE },
  curveSm: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  // Two soft concentric rings top-right give depth without muddying the navy.
  ringOuter: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -110,
    top: -120,
    backgroundColor: palette.white,
    opacity: 0.05,
  },
  ringInner: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -40,
    top: -60,
    backgroundColor: palette.white,
    opacity: 0.05,
  },
  watermark: { position: 'absolute', right: 8, bottom: -14, opacity: 0.08, transform: [{ rotate: '-12deg' }] },
  watermarkShifted: { right: 64 },
  topRow: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  largeBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl },
  largeBodyRoot: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: spacing.lg, gap: spacing.sm },
  inlineActions: { flexDirection: 'row', gap: spacing.sm, paddingBottom: 2 },
  accent: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondary,
    marginBottom: spacing.sm,
  },
  compactBar: {
    height: layout.headerHeight + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  titleInset: { paddingLeft: spacing.xs },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.24)' },
  dot: { position: 'absolute', top: -3, right: -3 },
});
