/**
 * Auth state + flows. Port of client/src/contexts/AuthContext.js and the OTP
 * logic in client/src/pages/auth/Login.js (WhatsApp OTP; new users register
 * inline with a name). Customer-only: merchant/admin sessions are rejected.
 *
 * Convention: these functions toast their own errors and success messages and
 * resolve to `{ success, ... }` — they never throw.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '../hooks/queryKeys';
import { authAPI, getErrorMessage, onSessionExpired, userAPI } from '../services/api';
import { getGoogleIdToken, googleSignOut, isGoogleSignInAvailable } from '../services/googleSignIn';
import { tokenStorage } from '../services/tokenStorage';
import type { AuthResponse, User } from '../types/models';
import { toast } from '../utils/toast';
import i18n from '../i18n';

const USER_CACHE_KEY = 'chardeevari.user';

export type AuthResult<T = object> = ({ success: true } & T) | { success: false; error: string };

export interface AuthContextValue {
  user: User | null;
  /** True until stored tokens are restored and validated on launch. */
  loading: boolean;
  isAuthenticated: boolean;
  /** Google users without a phone must link one before checkout (web parity). */
  needsPhone: boolean;
  /** False in Expo Go / builds without the native module — hide the Google button. */
  isGoogleAvailable: boolean;

  /** Step 1. `userExists === false` ⇒ ask for a name, then call verifyOtp with it. */
  sendOtp(phone: string): Promise<AuthResult<{ userExists: boolean; devOtp?: string }>>;
  /** Step 2. Logs in existing users; registers new users when `name` is given. */
  verifyOtp(args: { phone: string; otp: string; name?: string; userExists: boolean }): Promise<AuthResult<{ user: User }>>;
  /** Native Google account picker → /auth/google. `cancelled` when the user backs out. */
  loginWithGoogle(): Promise<AuthResult<{ user: User; phoneRequired: boolean } | { cancelled: true }>>;
  sendLinkPhoneOtp(phone: string): Promise<AuthResult<{ devOtp?: string }>>;
  linkPhone(phone: string, otp: string): Promise<AuthResult<{ user: User }>>;
  sendChangeEmailOtp(email: string): Promise<AuthResult<{ devOtp?: string }>>;
  verifyChangeEmail(email: string, otp: string): Promise<AuthResult<{ user: User }>>;
  updateProfile(data: Partial<Pick<User, 'name' | 'email'>>): Promise<AuthResult<{ user: User }>>;
  /** Re-fetch /auth/me. */
  refreshUser(): Promise<void>;
  logout(): Promise<void>;
  /** Delete the account server-side, then clear the local session. Error is returned, not toasted. */
  deleteAccount(): Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

const isCachedUser = (value: unknown): value is User =>
  !!value && typeof value === 'object' && '_id' in value && typeof value._id === 'string';

const customerOnlyMessage = () => i18n.t('common:auth.customerOnly');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    if (next) AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {});
  }, []);

  const clearSession = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    // Drop user-scoped server state (orders, order detail, totals priced for an address).
    queryClient.removeQueries({ queryKey: queryKeys.ordersAll });
    queryClient.removeQueries({ queryKey: ['order'] });
    queryClient.removeQueries({ queryKey: ['cart-pricing'] });
  }, [queryClient, setUser]);

  // Restore session: cached user renders instantly, /auth/me validates it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await tokenStorage.load();
        if (!tokens) {
          await AsyncStorage.removeItem(USER_CACHE_KEY);
          return;
        }
        const cached: unknown = JSON.parse((await AsyncStorage.getItem(USER_CACHE_KEY)) ?? 'null');
        if (isCachedUser(cached) && !cancelled) setUserState(cached);
        try {
          const { user: fresh } = await authAPI.me();
          if (!cancelled) setUser(fresh);
        } catch (error) {
          // Offline: keep cached user. Auth failure: interceptor already tried refresh.
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          if (status === 401 || status === 403) await clearSession();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession, setUser]);

  useEffect(() => onSessionExpired(() => setUser(null)), [setUser]);

  const userId = user?._id;
  // The device's language choice (made on first launch) is saved to the account so
  // order notifications arrive in the same language.
  const { i18n } = useTranslation();
  const appLanguage = i18n.language;
  const accountLanguage = user?.language;
  useEffect(() => {
    if (!userId || (appLanguage !== 'en' && appLanguage !== 'hi') || accountLanguage === appLanguage) return;
    userAPI
      .updateProfile({ language: appLanguage })
      .then(({ user: fresh }) => setUser(fresh))
      .catch(() => {});
  }, [userId, appLanguage, accountLanguage, setUser]);

  /** Persist tokens + user from an auth response. Rejects non-customer roles. */
  const acceptAuth = useCallback(
    async (data: AuthResponse): Promise<boolean> => {
      if (data.user.role !== 'customer') {
        // Revoke server refresh token for the rejected session, best effort.
        await tokenStorage.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        await authAPI.logout().catch(() => {});
        await tokenStorage.clear();
        toast.error(i18n.t('common:auth.customerRequired'), customerOnlyMessage());
        return false;
      }
      await tokenStorage.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setUser(data.user);
      return true;
    },
    [setUser],
  );

  const sendOtp = useCallback<AuthContextValue['sendOtp']>(async (phone) => {
    try {
      const data = await authAPI.sendOtp(phone.trim());
      if (data.userExists && data.userRole && data.userRole !== 'customer') {
        toast.error(i18n.t('common:auth.customerRequired'), customerOnlyMessage());
        return { success: false, error: customerOnlyMessage() };
      }
      return { success: true, userExists: data.userExists, devOtp: data.otp };
    } catch (error) {
      const message = getErrorMessage(error, i18n.t('common:auth.sendOtpFailed'));
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const verifyOtp = useCallback<AuthContextValue['verifyOtp']>(
    async ({ phone, otp, name, userExists }) => {
      try {
        if (!userExists) {
          const trimmed = name?.trim() ?? '';
          if (trimmed.length < 2) {
            const message = 'Please enter your name (at least 2 characters)';
            toast.error(message);
            return { success: false, error: message };
          }
          const data = await authAPI.verifyOtpRegister(trimmed, phone.trim(), otp.trim());
          await acceptAuth(data);
          toast.success(i18n.t('common:auth.accountCreated'), i18n.t('common:auth.nowLoggedIn'));
          return { success: true, user: data.user };
        }
        const data = await authAPI.verifyOtpLogin(phone.trim(), otp.trim());
        if (!(await acceptAuth(data))) return { success: false, error: customerOnlyMessage() };
        toast.success(i18n.t('common:auth.loginSuccess'));
        return { success: true, user: data.user };
      } catch (error) {
        const message = getErrorMessage(error, i18n.t('common:auth.otpFailed'));
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [acceptAuth],
  );

  const loginWithGoogle = useCallback<AuthContextValue['loginWithGoogle']>(async () => {
    try {
      const result = await getGoogleIdToken();
      if (result.type === 'cancelled') return { success: true, cancelled: true };
      const data = await authAPI.google(result.idToken);
      if (!(await acceptAuth(data))) return { success: false, error: customerOnlyMessage() };
      toast.success(i18n.t('common:auth.googleSuccess'));
      return { success: true, user: data.user, phoneRequired: data.phoneRequired };
    } catch (error) {
      const message = getErrorMessage(error, i18n.t('common:auth.googleFailed'));
      toast.error(message);
      return { success: false, error: message };
    }
  }, [acceptAuth]);

  const sendLinkPhoneOtp = useCallback<AuthContextValue['sendLinkPhoneOtp']>(async (phone) => {
    try {
      const data = await authAPI.sendLinkPhoneOtp(phone.trim());
      return { success: true, devOtp: data.otp };
    } catch (error) {
      const message = getErrorMessage(error, i18n.t('common:auth.sendOtpFailed'));
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const linkPhone = useCallback<AuthContextValue['linkPhone']>(
    async (phone, otp) => {
      try {
        const data = await authAPI.verifyLinkPhone(phone.trim(), otp.trim());
        setUser(data.user);
        toast.success(i18n.t('common:auth.phoneLinked'));
        return { success: true, user: data.user };
      } catch (error) {
        const message = getErrorMessage(error, i18n.t('common:auth.phoneFailed'));
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [setUser],
  );

  const sendChangeEmailOtp = useCallback<AuthContextValue['sendChangeEmailOtp']>(async (email) => {
    try {
      const data = await authAPI.sendChangeEmailOtp(email.trim());
      return { success: true, devOtp: data.otp };
    } catch (error) {
      const message = getErrorMessage(error, i18n.t('common:auth.sendCodeFailed'));
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const verifyChangeEmail = useCallback<AuthContextValue['verifyChangeEmail']>(
    async (email, otp) => {
      try {
        const data = await authAPI.verifyChangeEmail(email.trim(), otp.trim());
        setUser(data.user);
        toast.success(i18n.t('common:auth.emailUpdated'));
        return { success: true, user: data.user };
      } catch (error) {
        const message = getErrorMessage(error, i18n.t('common:auth.emailFailed'));
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [setUser],
  );

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (profile) => {
      try {
        const data = await userAPI.updateProfile(profile);
        setUser(data.user);
        toast.success(i18n.t('common:auth.profileUpdated'));
        return { success: true, user: data.user };
      } catch (error) {
        const message = getErrorMessage(error, i18n.t('common:auth.profileFailed'));
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [setUser],
  );

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.get()) return;
    try {
      const { user: fresh } = await authAPI.me();
      setUser(fresh);
    } catch {
      // Interceptor handles expiry; keep current state otherwise.
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    // Push stays registered; PushRegistrar re-registers without a session, detaching the account.
    if (tokenStorage.get()) await authAPI.logout().catch(() => {});
    await googleSignOut();
    await clearSession();
  }, [clearSession]);

  const deleteAccount = useCallback<AuthContextValue['deleteAccount']>(async () => {
    try {
      await userAPI.deleteAccount();
    } catch (error) {
      return { success: false, error: getErrorMessage(error, i18n.t('common:auth.deleteFailed')) };
    }
    // Server already disabled the account and its tokens; only local state remains.
    await googleSignOut();
    await clearSession();
    return { success: true };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      needsPhone: !!user && !user.phone,
      isGoogleAvailable: isGoogleSignInAvailable,
      sendOtp,
      verifyOtp,
      loginWithGoogle,
      sendLinkPhoneOtp,
      linkPhone,
      sendChangeEmailOtp,
      verifyChangeEmail,
      updateProfile,
      refreshUser,
      logout,
      deleteAccount,
    }),
    [
      user,
      loading,
      sendOtp,
      verifyOtp,
      loginWithGoogle,
      sendLinkPhoneOtp,
      linkPhone,
      sendChangeEmailOtp,
      verifyChangeEmail,
      updateProfile,
      refreshUser,
      logout,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
