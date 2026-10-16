import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isRunningInExpoGo } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppToast } from './src/components/ui/AppToast';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { loadLanguage } from './src/i18n';
import { LanguageSelectScreen } from './src/i18n/LanguageSelectScreen';
import { PushRegistrar } from './src/components/PushRegistrar';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});
// setOptions is native-build only; Expo Go throws.
if (!isRunningInExpoGo()) {
  SplashScreen.setOptions({ duration: 250, fade: true });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // undefined = still reading the saved language; false = ask on first launch.
  const [languageChosen, setLanguageChosen] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    loadLanguage().then(setLanguageChosen, () => setLanguageChosen(false));
  }, []);
  const ready = (fontsLoaded || !!fontError) && languageChosen !== undefined;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  if (!languageChosen) {
    return (
      <SafeAreaProvider>
        <LanguageSelectScreen onDone={() => setLanguageChosen(true)} />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <RootNavigator />
                <PushRegistrar />
                <StatusBar style="dark" />
                <AppToast />
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
