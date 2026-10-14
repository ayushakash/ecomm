/**
 * Guarded wrapper around @react-native-google-signin/google-signin.
 * The native module is absent in Expo Go (and its import throws there), so the
 * package is required lazily and only when the TurboModule is registered.
 */
import { Platform, TurboModuleRegistry } from 'react-native';
import type * as GoogleSigninNS from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID, IS_EXPO_GO } from '../config';

type GoogleSigninModule = typeof GoogleSigninNS;

/** Show the Google button only when this is true. */
export const isGoogleSignInAvailable: boolean =
  Platform.OS !== 'web' && !IS_EXPO_GO && !!GOOGLE_WEB_CLIENT_ID && TurboModuleRegistry.get('RNGoogleSignin') != null;

let mod: GoogleSigninModule | null = null;

function loadModule(): GoogleSigninModule {
  if (!isGoogleSignInAvailable) throw new Error('Google Sign-In is not available in this build');
  if (!mod) {
    mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    // webClientId makes the returned idToken's audience the web client — the
    // backend verifies against GOOGLE_CLIENT_ID (the same web client).
    mod.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ['profile', 'email'] });
  }
  return mod;
}

export type GoogleIdTokenResult = { type: 'success'; idToken: string } | { type: 'cancelled' };

/** Run the native account picker and return a Google ID token. Throws on real errors. */
export async function getGoogleIdToken(): Promise<GoogleIdTokenResult> {
  const { GoogleSignin, isErrorWithCode, statusCodes } = loadModule();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account chooser rather than silently reusing the last account.
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { type: 'cancelled' };
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google did not return an ID token');
    return { type: 'success', idToken };
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
      return { type: 'cancelled' };
    }
    throw error;
  }
}

/** Forget the cached Google account (called on app logout). Never throws. */
export async function googleSignOut(): Promise<void> {
  if (!isGoogleSignInAvailable) return;
  try {
    await loadModule().GoogleSignin.signOut();
  } catch {
    // Not signed in with Google — nothing to clear.
  }
}
