import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Share } from 'react-native';
import { openExternal } from '../utils/whatsapp';

const PACKAGE_ID = 'in.chardeevari.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;
const PLAY_STORE_APP_URL = `market://details?id=${PACKAGE_ID}`;

const LAST_PROMPT_KEY = 'review:lastPromptAt';
const PROMPT_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;

/** "Rate us" row: open the Play Store app listing, falling back to the web listing. */
export async function rateApp(errorMessage: string): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_APP_URL);
  } catch {
    await openExternal(PLAY_STORE_URL, errorMessage);
  }
}

/**
 * Google Play in-app review sheet after a delivered order, at most once per 90 days.
 * Play decides whether the sheet actually appears; the user can always dismiss it.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const last = Number(await AsyncStorage.getItem(LAST_PROMPT_KEY)) || 0;
    if (Date.now() - last < PROMPT_INTERVAL_MS) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    // Never block the order screen on a review prompt.
  }
}

/** Native share sheet (WhatsApp, SMS, …) with a ready-made message and the Play Store link. */
export async function shareApp(message: string): Promise<void> {
  await Share.share({ message: `${message}\n${PLAY_STORE_URL}` });
}
