import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Requests notification permission and returns an Expo push token, or null
 * if permission was denied, this is web (a different delivery mechanism,
 * not wired up here), or registration otherwise fails — e.g. no FCM
 * credentials configured yet for this build. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    Sentry.captureMessage('Push registration skipped: permission not granted', {
      level: 'info',
      tags: { push_registration_outcome: 'permission_denied' },
    });
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    // Previously swallowed completely silently — meaning a real FCM/Expo
    // registration failure (bad credentials, misconfigured Firebase app,
    // etc.) was indistinguishable from "everything's fine, user just
    // declined the permission." Now it's at least visible.
    Sentry.captureException(err, { tags: { push_registration_outcome: 'token_fetch_failed' } });
    return null;
  }
}
