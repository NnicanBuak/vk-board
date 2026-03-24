import { api } from './client';
import type { CommentCreateInput, CommentDto } from '../../shared/types/comment';

export const commentsApi = {
  list: (cardId: string) =>
    api.get<CommentDto[]>(`/comments?cardId=${cardId}`),

  create: (data: CommentCreateInput) =>
    api.post<CommentDto>('/comments', data),

  delete: (id: string) =>
    api.delete<void>(`/comments/${id}`),
};
