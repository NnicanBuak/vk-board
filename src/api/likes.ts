import { api } from './client';
import type { LikeCountDto } from '../../shared/types/like';

export const likesApi = {
  add: (cardId: string) => api.post<LikeCountDto>('/likes', { cardId }),
  remove: (cardId: string) => api.delete<LikeCountDto>('/likes', { cardId }),
};
