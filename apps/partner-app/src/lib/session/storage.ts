import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthenticatedRestaurant, StaffSession } from '../api';

// The token is the actual credential - it alone goes into SecureStore
// (Keychain on iOS, Keystore-backed on Android), not plain AsyncStorage,
// which is unencrypted on-disk storage readable by anything with app-sandbox
// access on a compromised device (see security review). Everything else
// here (restaurant/staff identity) is just display data, not a secret, so
// it stays in AsyncStorage - no reason to risk SecureStore's ~2KB per-value
// limit on data that doesn't need this protection.
const TOKEN_KEY = 'partner-app-token';
const REST_KEY = 'partner-app-session-rest';

export interface StoredSession {
  token: string;
  restaurant: AuthenticatedRestaurant;
  staff?: StaffSession;
}

export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const [token, restRaw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      AsyncStorage.getItem(REST_KEY),
    ]);
    if (!token || !restRaw) return null;
    const rest = JSON.parse(restRaw) as Omit<StoredSession, 'token'>;
    return { token, ...rest };
  } catch {
    return null;
  }
}

export async function setStoredSession(session: StoredSession | null): Promise<void> {
  try {
    if (session) {
      const { token, ...rest } = session;
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, token),
        AsyncStorage.setItem(REST_KEY, JSON.stringify(rest)),
      ]);
    } else {
      await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), AsyncStorage.removeItem(REST_KEY)]);
    }
  } catch {
    // storage unavailable — app still works for this session
  }
}
