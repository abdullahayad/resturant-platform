import { createContext, useContext } from 'react';
import type { AuthenticatedRestaurant, StaffSession } from './api';

export interface AuthContextValue {
  token: string;
  restaurant: AuthenticatedRestaurant;
  staff?: StaffSession;
  setRestaurant: (restaurant: AuthenticatedRestaurant) => void;
  setToken: (token: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthContext.Provider');
  return ctx;
}
