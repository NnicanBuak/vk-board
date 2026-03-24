import { api } from './client';
import type {
  TagAssignResponse,
  TagCreateInput,
  TagDto,
} from '../../shared/types/tag';

export const tagsApi = {
  list: (boardId: string) =>
    api.get<TagDto[]>(`/tags?boardId=${boardId}`),

  create: (data: TagCreateInput) =>
    api.post<TagDto>('/tags', data),

  delete: (id: string) =>
    api.delete<void>(`/tags/${id}`),

  assign: (cardId: string, tagId: string) =>
    api.post<TagAssignResponse>('/tags/assign', { cardId, tagId }),

  unassign: (cardId: string, tagId: string) =>
    api.delete<void>('/tags/assign', { cardId, tagId }),
};
