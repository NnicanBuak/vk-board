import { api } from './client';
import type { Comment } from '../types/card';

export const commentsApi = {
  list: (cardId: string) =>
    api.get<Comment[]>(`/comments?cardId=${cardId}`),

  create: (data: { cardId: string; text: string }) =>
    api.post<Comment>('/comments', data),

  delete: (id: string) =>
    api.delete<void>(`/comments/${id}`),
};
