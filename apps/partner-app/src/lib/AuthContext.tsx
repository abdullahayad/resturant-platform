import { createContext, useContext } from 'react';
import type { AuthenticatedRestaurant } from './api';

export interface AuthContextValue {
  token: string;
  restaurant: AuthenticatedRestaurant;
  setRestaurant: (restaurant: AuthenticatedRestaurant) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthContext.Provider');
  return ctx;
}
