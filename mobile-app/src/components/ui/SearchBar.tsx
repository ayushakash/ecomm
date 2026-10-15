import React, { forwardRef, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { colors, fonts, radii, shadows, spacing } from '../../theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';


/** common:search.hints.* keys, translated at render. */
const DEFAULT_HINT_KEYS = ['cement', 'tmt', 'bricks', 'sand', 'chips', 'tiles'] as const;

export interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  /**
   * Static mode (no typing): renders a button with rotating hints — use on Home
   * to open the Search screen. Provide `onPress`.
   */
  onPress?: () => void;
  /** Rotating "Search for "…"" hints (static mode / empty input). */
  hints?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  /** Trailing element (e.g. filter button). */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function RotatingHint({ hints }: { hints: string[] }) {
  const { t } = useTranslation('common');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (hints.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % hints.length), 2400);
    return () => clearInterval(timer);
  }, [hints.length]);
  return (
    <View style={styles.hintRow} pointerEvents="none">
      <Text variant="body" color="textMuted">
        {t('search.searchFor')}
      </Text>
      <Animated.View key={index} entering={FadeInDown.duration(260)} exiting={FadeOutUp.duration(200)}>
        <Text variant="body" color="textMuted" weight="semibold">
          “{hints[index]}”
        </Text>
      </Animated.View>
    </View>
  );
}

export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  { value = '', onChangeText, onSubmit, onPress, hints: hintsProp, placeholder, autoFocus, right, style },
  ref,
) {
  const { t } = useTranslation('common');
  const hints = hintsProp ?? DEFAULT_HINT_KEYS.map((k) => t(`search.hints.${k}`));
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={t('search.a11y')}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed, style]}
      >
        <Icon name="search" size={20} color="textSecondary" />
        <View style={styles.flex}>
          <RotatingHint hints={hints} />
        </View>
        {right}
      </Pressable>
    );
  }
  return (
    <View style={[styles.bar, style]}>
      <Icon name="search" size={20} color="textSecondary" />
      <View style={styles.flex}>
        {!value && !placeholder && <RotatingHint hints={hints} />}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={(e) => onSubmit?.(e.nativeEvent.text)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          selectionColor={colors.primary}
          style={[styles.input, !value && !placeholder && StyleSheet.absoluteFill]}
          accessibilityLabel={t('search.a11y')}
        />
      </View>
      {!!value && (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={10} accessibilityLabel={t('search.clear')}>
          <Icon name="close-circle" size={18} color="textMuted" />
        </Pressable>
      )}
      {right}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  flex: { flex: 1, justifyContent: 'center', height: '100%' },
  hintRow: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  input: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, paddingVertical: 0 },
});
