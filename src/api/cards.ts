import { api } from './client';
import type { Card, CardStatus } from '../types/card';

export type SortMode = 'likes' | 'date';

export const cardsApi = {
  list: (boardId: string, sort: SortMode = 'date') =>
    api.get<Card[]>(`/cards?boardId=${boardId}&sort=${sort}`),

  create: (data: {
    boardId: string;
    title: string;
    description?: string;
    url?: string;
    imageUrl?: string;
  }) => api.post<Card>('/cards', data),

  update: (
    id: string,
    data: { title?: string; description?: string; url?: string; imageUrl?: string; status?: CardStatus },
  ) => api.patch<Card>(`/cards/${id}`, data),

  delete: (id: string) => api.delete<void>(`/cards/${id}`),
};
