import { api } from './client';
import type { Board } from '../types/board';

export const boardsApi = {
  list: () => api.get<Board[]>('/boards'),

  get: (id: string) => api.get<Board>(`/boards/${id}`),

  create: (data: { title: string; description?: string; chatId?: string; coverImage?: string; boardType?: string }) =>
    api.post<Board>('/boards', data),

  update: (id: string, data: { title?: string; description?: string; coverImage?: string; boardType?: string; visibility?: string; groupId?: string | null }) =>
    api.patch<Board>(`/boards/${id}`, data),

  delete: (id: string) => api.delete<void>(`/boards/${id}`),

  members: (id: string) => api.get<{ userId: number; role: string }[]>(`/boards/${id}/members`),

  addMember: (id: string, userId: number, role: string) =>
    api.post<{ userId: number; role: string }>(`/boards/${id}/members`, { userId, role }),

  updateMember: (id: string, userId: number, role: string) =>
    api.patch<{ userId: number; role: string }>(`/boards/${id}/members/${userId}`, { role }),

  removeMember: (id: string, userId: number) =>
    api.delete<void>(`/boards/${id}/members/${userId}`),
};
