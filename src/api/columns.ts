import { api } from './client';
import type { Column } from '../types/card';

export const columnsApi = {
  list: (boardId: string) =>
    api.get<Column[]>(`/columns?boardId=${boardId}`),

  create: (data: { boardId: string; title: string }) =>
    api.post<Column>('/columns', data),

  update: (id: string, data: { title?: string; order?: number }) =>
    api.patch<Column>(`/columns/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/columns/${id}`),
};
