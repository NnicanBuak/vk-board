import { useState, type ReactNode } from 'react';
import type { VKUser } from '../types/user';
import { UserContext } from './userState';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VKUser | null>(null);
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}
