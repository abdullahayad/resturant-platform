import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import type { ScreenKey } from '../lib/nav';

const SCREEN_KEYS: ScreenKey[] = [
  'dashboard', 'profile', 'menu', 'gallery', 'chefManagement', 'chefTable',
  'reviews', 'reservations', 'analytics', 'promotions', 'advertising', 'announcements', 'settings',
];

function screenFromResponse(response: Notifications.NotificationResponse | null): ScreenKey | null {
  const screen = response?.notification.request.content.data?.screen;
  return typeof screen === 'string' && (SCREEN_KEYS as string[]).includes(screen) ? (screen as ScreenKey) : null;
}

/** Navigates to the screen named in a push notification's `data.screen` when
 * the user taps it — covers both tapping while the app is already running
 * (addNotificationResponseReceivedListener) and tapping a notification that
 * cold-starts the app (getLastNotificationResponseAsync, checked once on
 * mount). Without this, every notification just opens the app to whatever
 * screen was already showing, regardless of what it's actually about. */
export function useNotificationNavigation(onNavigate: (screen: ScreenKey) => void) {
  useEffect(() => {
    // Not available on every native module build (throws "method or property
    // ... is not available" in some cases) — this is a nice-to-have for the
    // cold-start case, so a failure here should never break app startup.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const screen = screenFromResponse(response);
        if (screen) onNavigate(screen);
      })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = screenFromResponse(response);
      if (screen) onNavigate(screen);
    });

    return () => subscription.remove();
  }, [onNavigate]);
}
