import { api } from './client';
import type {
  NoteCreateInput,
  NoteDto,
  NoteUpdateInput,
} from '../../shared/types/note';

export const notesApi = {
  list: (boardId: string) => api.get<NoteDto[]>(`/boards/${boardId}/notes`),

  create: (boardId: string, data: NoteCreateInput) =>
    api.post<NoteDto>(`/boards/${boardId}/notes`, data),

  update: (noteId: string, data: NoteUpdateInput) =>
    api.patch<NoteDto>(`/notes/${noteId}`, data),

  delete: (noteId: string) => api.delete<void>(`/notes/${noteId}`),
};
