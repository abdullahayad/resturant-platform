import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, setAuthToken, type Customer } from './api';

// Kept in the phone's encrypted storage (Android Keystore / iOS Keychain),
// never in plain app storage.
const TOKEN_KEY = 'ligeta.customerToken';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  customer: Customer | null;
  signIn: (token: string, customer: Customer) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  update: (data: { name?: string; isPublic?: boolean }) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Browsing never needs this; it only matters for the Profile tab, the visit
// code and pre-filling bookings.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [customer, setCustomer] = useState<Customer | null>(null);

  const forget = useCallback(async () => {
    setAuthToken(null);
    setCustomer(null);
    setStatus('signedOut');
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, []);

  // Stable across renders, so screens can call it from focus effects
  // without re-triggering themselves.
  const refresh = useCallback(async () => {
    try {
      setCustomer(await api.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await forget();
    }
  }, [forget]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (!token) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      try {
        const me = await api.me();
        if (!cancelled) {
          setCustomer(me);
          setStatus('signedIn');
        }
      } catch (e) {
        // Only a rejected token signs the customer out - being offline at
        // startup keeps them signed in.
        if (e instanceof ApiError && e.status === 401) await forget();
        else if (!cancelled) setStatus('signedIn');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forget]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      customer,
      signIn: async (token, me) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        setAuthToken(token);
        setCustomer(me);
        setStatus('signedIn');
      },
      signOut: forget,
      refresh,
      update: async (data) => {
        setCustomer(await api.updateMe(data));
      },
      deleteAccount: async () => {
        await api.deleteMe();
        await forget();
      },
    }),
    [status, customer, forget, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
