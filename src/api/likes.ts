import { api } from './client';

export const likesApi = {
  add: (cardId: string) => api.post<{ likeCount: number }>('/likes', { cardId }),
  remove: (cardId: string) => api.delete<{ likeCount: number }>('/likes', { cardId }),
};
