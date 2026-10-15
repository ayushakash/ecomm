/**
 * Push notifications: channel setup, Expo push token registration, tap → deep link,
 * and local test previews.
 *
 * expo-notifications is a native module missing from Expo Go and older dev builds,
 * so it is loaded lazily and every entry point is a no-op/explicit error without it.
 */
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type * as NotificationsNS from 'expo-notifications';

type NotificationsModule = typeof NotificationsNS;

/** Android channels; the backend targets these ids (services/ExpoPushService.js CHANNELS). */
export const OFFERS_CHANNEL = 'offers';
export const ORDERS_CHANNEL = 'orders';

// Expo Go ships some notification modules but not ExpoTopicSubscriptionModule, and
// requiring expo-notifications throws without it — so check both.
export const isNotificationsAvailable: boolean =
  Platform.OS !== 'web' &&
  requireOptionalNativeModule('ExpoNotificationPresenter') != null &&
  requireOptionalNativeModule('ExpoTopicSubscriptionModule') != null;

let mod: NotificationsModule | null = null;
let setupPromise: Promise<NotificationsModule> | null = null;

function load(): Promise<NotificationsModule> {
  if (!isNotificationsAvailable) {
    return Promise.reject(new Error('Notifications need a new app build (expo-notifications is not in this build).'));
  }
  setupPromise ??= (async () => {
    mod = require('expo-notifications') as NotificationsModule;
    // Show banners even while the app is open.
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await mod.setNotificationChannelAsync(OFFERS_CHANNEL, {
        name: 'Offers & deals',
        importance: mod.AndroidImportance.HIGH,
        lightColor: '#F18C34',
      });
      await mod.setNotificationChannelAsync(ORDERS_CHANNEL, {
        name: 'Order updates',
        importance: mod.AndroidImportance.MAX,
        lightColor: '#F18C34',
      });
    }
    return mod;
  })();
  return setupPromise;
}

async function ensurePermission(Notifications: NotificationsModule, ask: boolean): Promise<boolean> {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) ({ status } = await Notifications.requestPermissionsAsync());
  return status === 'granted';
}

/**
 * Asks permission (once; Android 13+/iOS show a prompt) and returns this device's
 * Expo push token, or null when unavailable/denied.
 */
export async function getPushToken(): Promise<string | null> {
  if (!isNotificationsAvailable) return null;
  const Notifications = await load();
  if (!(await ensurePermission(Notifications, true))) return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

// ─── Tap handling (React Navigation `linking.getInitialURL` / `subscribe`) ────────

const urlOf = (response: NotificationsNS.NotificationResponse | null | undefined): string | undefined => {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' ? url : undefined;
};

/** Web links open in the browser; app links are handed to navigation. */
const route = (url: string, toApp: (url: string) => void) => {
  if (/^https?:\/\//i.test(url)) Linking.openURL(url).catch(() => {});
  else toApp(url);
};

/** Deep link from the notification that cold-started the app, if any. */
export async function getInitialNotificationUrl(): Promise<string | null> {
  if (!isNotificationsAvailable) return null;
  const Notifications = await load();
  const url = urlOf(Notifications.getLastNotificationResponse());
  if (!url) return null;
  let appUrl: string | null = null;
  route(url, (u) => (appUrl = u));
  return appUrl;
}

/** Calls `listener` with the deep link of every notification tapped while the app runs. */
export function subscribeNotificationUrls(listener: (url: string) => void): () => void {
  if (!isNotificationsAvailable) return () => {};
  let sub: { remove(): void } | null = null;
  let cancelled = false;
  load()
    .then((Notifications) => {
      if (cancelled) return;
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const url = urlOf(response);
        if (url) route(url, listener);
      });
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    sub?.remove();
  };
}

// ─── Local previews (Account → Test notifications, dev builds only) ──────────────

export type TestNotificationKind = 'offer' | 'order' | 'cart';

const SAMPLES: Record<TestNotificationKind, { channel: string; title: string; body: string; url: string }> = {
  offer: {
    channel: OFFERS_CHANNEL,
    title: '🔥 Diwali offer: ₹20 off every cement bag',
    body: 'UltraTech & ACC at the lowest price in Ranchi. Same-day delivery. Offer ends Sunday!',
    url: 'chardeevari://products',
  },
  order: {
    channel: ORDERS_CHANNEL,
    title: '🚚 Your order is out for delivery',
    body: 'Order #CD1042 (50 bags cement, 1 ton TMT) will reach your site by 4 PM today.',
    url: 'chardeevari://orders',
  },
  cart: {
    channel: OFFERS_CHANNEL,
    title: 'You left items in your cart 🧱',
    body: '2,000 red bricks are waiting. Complete your order today for free delivery.',
    url: 'chardeevari://cart',
  },
};

/** Asks permission if needed, then fires a sample after `delaySeconds` (time to background the app). */
export async function sendTestNotification(kind: TestNotificationKind, delaySeconds = 3): Promise<void> {
  const Notifications = await load();
  if (!(await ensurePermission(Notifications, true))) {
    throw new Error('Notification permission was denied. Enable it in phone Settings → Apps → Chardeevari.');
  }
  const sample = SAMPLES[kind];
  await Notifications.scheduleNotificationAsync({
    content: { title: sample.title, body: sample.body, data: { test: true, kind, url: sample.url }, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      channelId: sample.channel,
    },
  });
}
