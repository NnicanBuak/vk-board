import { createContext, useContext } from 'react';
import type { VKUser } from '../types/user';

export interface UserContextValue {
  user: VKUser | null;
  setUser: (user: VKUser) => void;
}

export const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used inside UserProvider');
  }
  return ctx;
}
