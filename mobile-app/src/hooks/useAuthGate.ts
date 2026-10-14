import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { LoginRedirect, RootNavigation } from '../navigation/types';

/**
 * Guard an action behind login (web: postLoginRedirect + navigate('/login')).
 * `requireAuth(redirect)` returns true when logged in; otherwise opens the Login
 * modal, which replaces itself with `redirect` after success, and returns false.
 */
export function useAuthGate() {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<RootNavigation>();
  return useCallback(
    (redirect?: LoginRedirect): boolean => {
      if (isAuthenticated) return true;
      navigation.navigate('Login', { redirect });
      return false;
    },
    [isAuthenticated, navigation],
  );
}
