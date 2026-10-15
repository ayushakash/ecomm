import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { colors, radii, SCREEN_PADDING, spacing } from '../theme';
import { LANGUAGES, setLanguage, type Language } from './index';

const LOGO = require('../../assets/logo.png');

/** First-launch language choice, shown before the app until the user picks one. */
export function LanguageSelectScreen({ onDone }: { onDone(): void }) {
  const insets = useSafeAreaInsets();
  const choose = async (lng: Language) => {
    await setLanguage(lng);
    onDone();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      {/* Bilingual on purpose: the user hasn't picked a language yet. */}
      <Text variant="h1" weight="bold" align="center">
        Choose your language
      </Text>
      <Text variant="h2" weight="semibold" align="center" color="textSecondary">
        अपनी भाषा चुनें
      </Text>
      <View style={styles.options}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            onPress={() => void choose(l.code)}
            accessibilityRole="button"
            accessibilityLabel={l.label}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Text variant="h2" weight="bold" align="center">
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: SCREEN_PADDING, justifyContent: 'center', gap: spacing.sm },
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: spacing.xl },
  options: { marginTop: spacing.xxl, gap: spacing.md },
  option: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  optionPressed: { borderColor: colors.secondary, opacity: 0.9 },
});
