import { api } from './client';
import type { Note } from '../types/note';

export const notesApi = {
  list: (boardId: string) => api.get<Note[]>(`/boards/${boardId}/notes`),

  create: (boardId: string, data: { title: string; parentId?: string; content?: string }) =>
    api.post<Note>(`/boards/${boardId}/notes`, data),

  update: (noteId: string, data: { title?: string; content?: string; order?: number; parentId?: string | null }) =>
    api.patch<Note>(`/notes/${noteId}`, data),

  delete: (noteId: string) => api.delete<void>(`/notes/${noteId}`),
};
