import { api } from './client';
import type { PresenceUserProfile, PresenceUserPublic } from '../../shared/types/presence';

export type PresenceUser = PresenceUserPublic;
export type PresenceUserSelf = PresenceUserProfile;

export const presenceApi = {
  join: (boardId: string, user: PresenceUserProfile) =>
    api.put<void>(`/boards/${boardId}/presence`, user),

  leave: (boardId: string) =>
    api.delete<void>(`/boards/${boardId}/presence`),

  list: (boardId: string) =>
    api.get<PresenceUserPublic[]>(`/boards/${boardId}/presence`),
};
