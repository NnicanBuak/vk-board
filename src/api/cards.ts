import { api } from './client';
import type {
  CardCreateInput,
  CardDto,
  CardSortMode,
  CardUpdateInput,
} from '../../shared/types/card';

export type SortMode = CardSortMode;

export const cardsApi = {
  list: (boardId: string, sort: SortMode = 'date') =>
    api.get<CardDto[]>(`/cards?boardId=${boardId}&sort=${sort}`),

  create: (data: CardCreateInput) => api.post<CardDto>('/cards', data),

  update: (id: string, data: CardUpdateInput) => api.patch<CardDto>(`/cards/${id}`, data),

  delete: (id: string) => api.delete<void>(`/cards/${id}`),
};
