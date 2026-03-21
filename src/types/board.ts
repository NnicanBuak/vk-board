import type { BoardRoleServer, BoardTypeServer, BoardWithRole } from './prisma';

export type BoardRole = BoardRoleServer | 'owner' | 'editor' | 'viewer';
export type BoardType = BoardTypeServer;
export type BoardVisibility = 'public' | 'private';

export type Board = Omit<BoardWithRole, 'myRole'> & {
  myRole: BoardRole;
  boardType: BoardType;
  groupId?: string | null;
  visibility?: BoardVisibility;
};
