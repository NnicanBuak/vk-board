export type BoardRole = 'admin' | 'member';
export type BoardType = 'voting' | 'kanban' | 'brainstorm' | 'retro';

export interface Board {
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
