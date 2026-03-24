export type BoardRole = 'owner' | 'editor' | 'viewer';
export type BoardType = 'kanban' | 'brainstorm' | 'notes';
export type BoardVisibility = 'public' | 'private';

export interface BoardDto {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  boardType: BoardType;
  chatId: string | null;
  creatorId: number;
  createdAt: string;
  myRole: BoardRole;
}

export interface BoardMemberDto {
  userId: number;
  role: BoardRole;
}

export interface BoardCreateInput {
  title: string;
  description?: string;
  chatId?: string;
  coverImage?: string;
  boardType?: BoardType;
}

export interface BoardUpdateInput {
  title?: string;
  description?: string;
  coverImage?: string;
  boardType?: BoardType;
  visibility?: BoardVisibility;
}
