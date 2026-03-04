import { api } from './client';
import type { Board } from '../types/board';

export const boardsApi = {
  list: () => api.get<Board[]>('/boards'),

  get: (id: string) => api.get<Board>(`/boards/${id}`),

  create: (data: { title: string; description?: string; chatId?: string }) =>
    api.post<Board>('/boards', data),

  delete: (id: string) => api.delete<void>(`/boards/${id}`),
};
