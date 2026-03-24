import { api, setToken } from './client';
import type { AuthRequest, AuthResponse } from '../../shared/types/auth';

/** Request a JWT from the backend and store it for subsequent requests. */
export async function authenticate(payload: AuthRequest): Promise<void> {
  const { token } = await api.post<AuthResponse>('/auth', payload);
  setToken(token);
}
