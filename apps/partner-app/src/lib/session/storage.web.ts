import type { AuthenticatedRestaurant, StaffSession } from '../api';

const STORAGE_KEY = 'partner-app-session';

export interface StoredSession {
  token: string;
  restaurant: AuthenticatedRestaurant;
  staff?: StaffSession;
}

export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export async function setStoredSession(session: StoredSession | null): Promise<void> {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable — app still works for this session
  }
}
