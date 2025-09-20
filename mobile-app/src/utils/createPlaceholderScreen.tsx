import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, SIZES } from '../theme';

export const createPlaceholderScreen = (screenName: string) => {
  const PlaceholderScreen: React.FC = () => {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{screenName}</Text>
          <Text style={styles.subtitle}>Coming Soon...</Text>
        </View>
      </SafeAreaView>
    );
  };

  return PlaceholderScreen;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
});

export default createPlaceholderScreen;