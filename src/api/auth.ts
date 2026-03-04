import { api, setToken } from './client';

interface AuthResponse {
  token: string;
}

/** Request a JWT from the backend and store it for subsequent requests. */
export async function authenticate(payload: {
  vk_params?: string;
  userId?: number;
  firstName?: string;
  lastName?: string;
}): Promise<void> {
  const { token } = await api.post<AuthResponse>('/auth', payload);
  setToken(token);
}
