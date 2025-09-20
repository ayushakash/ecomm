import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { THEME, SIZES } from '../../theme';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  text: {
    marginTop: SIZES.md,
    fontSize: 16,
    color: THEME.textSecondary,
  },
});

export default LoadingScreen;