import { api } from './client';
import type {
  ColumnCreateInput,
  ColumnDto,
  ColumnUpdateInput,
} from '../../shared/types/column';

export const columnsApi = {
  list: (boardId: string) =>
    api.get<ColumnDto[]>(`/columns?boardId=${boardId}`),

  create: (data: ColumnCreateInput) =>
    api.post<ColumnDto>('/columns', data),

  update: (id: string, data: ColumnUpdateInput) =>
    api.patch<ColumnDto>(`/columns/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/columns/${id}`),
};
