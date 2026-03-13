import { api } from './client';
import type { Board } from '../types/board';

export const boardsApi = {
  list: () => api.get<Board[]>('/boards'),

  get: (id: string) => api.get<Board>(`/boards/${id}`),

  create: (data: { title: string; description?: string; chatId?: string; coverImage?: string; boardType?: string }) =>
    api.post<Board>('/boards', data),

  update: (id: string, data: { title?: string; description?: string; coverImage?: string; boardType?: string }) =>
    api.patch<Board>(`/boards/${id}`, data),

  delete: (id: string) => api.delete<void>(`/boards/${id}`),

  members: (id: string) => api.get<{ userId: number; role: string }[]>(`/boards/${id}/members`),
};
