import { api } from './client';

export interface PresenceUser {
  userId: number;
  firstName: string;
  lastName: string;
  photo100: string;
}

export const presenceApi = {
  join: (boardId: string, user: Omit<PresenceUser, 'userId'>) =>
    api.put<void>(`/boards/${boardId}/presence`, user),

  leave: (boardId: string) =>
    api.delete<void>(`/boards/${boardId}/presence`),

  list: (boardId: string) =>
    api.get<PresenceUser[]>(`/boards/${boardId}/presence`),
};
