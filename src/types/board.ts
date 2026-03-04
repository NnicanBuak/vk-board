export type BoardRole = 'admin' | 'member';

export interface Board {
  id: string;
  title: string;
  description: string | null;
  chatId: string | null;
  creatorId: number;
  createdAt: string;
  myRole: BoardRole;
}
