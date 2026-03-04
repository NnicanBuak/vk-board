import { createContext, useContext, useState, ReactNode } from 'react';
import type { VKUser } from '../types/user';

interface UserContextValue {
  user: VKUser | null;
  setUser: (user: VKUser) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VKUser | null>(null);
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
