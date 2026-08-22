import { useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';

/** Registers this device for push on login, unregisters on sign-out — mirrors
 * the mount/unmount of AppShell itself, which only happens on those two
 * transitions. Silently no-ops if permission is denied or no push token can
 * be obtained (e.g. no FCM credentials configured on this build yet). */
export function usePushRegistration() {
  const { token } = useAuth();

  useEffect(() => {
    let pushToken: string | null = null;
    let cancelled = false;

    registerForPushNotificationsAsync().then((expoPushToken) => {
      if (cancelled || !expoPushToken) return;
      pushToken = expoPushToken;
      api.registerPushToken(token, expoPushToken).catch(() => {});
    });

    return () => {
      cancelled = true;
      if (pushToken) api.unregisterPushToken(token, pushToken).catch(() => {});
    };
  }, [token]);
}
