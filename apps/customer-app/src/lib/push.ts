import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { api } from './api';

// Notifications show even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The token registered for the signed-in account, so sign out can remove it.
let registeredToken: string | null = null;

// Asks for permission (only the first time - Android/iOS remember the
// answer), then tells the server this phone can receive this account's
// notifications, in the app's current language. Quietly does nothing on an
// emulator or if the customer says no.
export async function registerForPush(language: 'ar' | 'en'): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'LiGETA',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(token, language);
    registeredToken = token;
  } catch {
    // No notifications on this phone - everything else still works.
  }
}

export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await api.removePushToken(token).catch(() => {});
}

// Where a tapped notification leads - matches data.screen set by the server
// (customer-notifications.service.ts and campaigns.service.ts).
export function openFromNotification(data: Record<string, unknown> | undefined) {
  const screen = typeof data?.screen === 'string' ? data.screen : 'home';
  const id = typeof data?.id === 'string' ? data.id : undefined;
  if (screen === 'restaurant' && id) router.push({ pathname: '/restaurant/[id]', params: { id } });
  else if (screen === 'mood' && id) router.push({ pathname: '/explore', params: { moodId: id } });
  else if (screen === 'healthy') router.push({ pathname: '/explore', params: { healthy: '1' } });
  else if (screen === 'offers') router.push('/offers');
  else if (screen === 'events') router.push('/events');
  else if (screen === 'bookings') router.push('/bookings');
  else if (screen === 'help') router.push('/help');
  else router.push('/notifications');
}
