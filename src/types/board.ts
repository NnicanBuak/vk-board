export type BoardRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
export type BoardType = 'kanban' | 'brainstorm' | 'notes';
export type BoardVisibility = 'public' | 'private';

export interface Board {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  boardType: BoardType;
  chatId: string | null;
  groupId: string | null;
  visibility: BoardVisibility;
  creatorId: number;
  createdAt: string;
  myRole: BoardRole;
}
