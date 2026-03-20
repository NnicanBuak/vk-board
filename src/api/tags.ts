import { api } from './client';
import type { Tag } from '../types/card';

export const tagsApi = {
  list: (boardId: string) =>
    api.get<Tag[]>(`/tags?boardId=${boardId}`),

  create: (data: { boardId: string; name: string; color?: string }) =>
    api.post<Tag>('/tags', data),

  delete: (id: string) =>
    api.delete<void>(`/tags/${id}`),

  assign: (cardId: string, tagId: string) =>
    api.post<{ cardId: string; tagId: string }>('/tags/assign', { cardId, tagId }),

  unassign: (cardId: string, tagId: string) =>
    api.delete<void>('/tags/assign', { cardId, tagId }),
};
