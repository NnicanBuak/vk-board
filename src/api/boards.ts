import { api } from './client';
import type {
  BoardCreateInput,
  BoardDto,
  BoardMemberDto,
  BoardRole,
  BoardUpdateInput,
} from '../../shared/types/board';

export const boardsApi = {
  list: () => api.get<BoardDto[]>('/boards'),

  get: (id: string) => api.get<BoardDto>(`/boards/${id}`),

  create: (data: BoardCreateInput) =>
    api.post<BoardDto>('/boards', data),

  update: (id: string, data: BoardUpdateInput) =>
    api.patch<BoardDto>(`/boards/${id}`, data),

  delete: (id: string) => api.delete<void>(`/boards/${id}`),

  members: (id: string) => api.get<BoardMemberDto[]>(`/boards/${id}/members`),

  addMember: (id: string, userId: number, role: BoardRole) =>
    api.post<BoardMemberDto>(`/boards/${id}/members`, { userId, role }),

  updateMember: (id: string, userId: number, role: BoardRole) =>
    api.patch<BoardMemberDto>(`/boards/${id}/members/${userId}`, { role }),

  removeMember: (id: string, userId: number) =>
    api.delete<void>(`/boards/${id}/members/${userId}`),
};
