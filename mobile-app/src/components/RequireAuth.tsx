import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import type { LoginRedirect, RootNavigation } from '../navigation/types';
import { colors } from '../theme';
import { EmptyState } from './ui/EmptyState';
import { ScreenHeader } from './ui/ScreenHeader';
import { useTranslation } from 'react-i18next';


export interface RequireAuthProps {
  children: React.ReactNode;
  /** Where Login should land after success (default: back to where the user was). */
  redirect?: LoginRedirect;
  /** Header title shown on the gate (stack screens). Omit for tab screens that render their own header. */
  title?: string;
  message?: string;
}

/** Web ProtectedRoute equivalent: renders children only when logged in, else a login prompt. */
export function RequireAuth({ children, redirect, title, message }: RequireAuthProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigation = useNavigation<RootNavigation>();
  const { t } = useTranslation('common');
  if (isAuthenticated) return <>{children}</>;
  return (
    <View style={styles.root}>
      {title && <ScreenHeader title={title} />}
      {loading ? (
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      ) : (
        <EmptyState
          icon="person-circle-outline"
          title={t('auth.loginTitle')}
          message={message ?? t('auth.loginMessage')}
          actionLabel={t('actions.login')}
          onAction={() => navigation.navigate('Login', { redirect })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
});
