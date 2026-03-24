export interface AuthRequest {
  vk_params?: string;
  userId?: number;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  token: string;
}
