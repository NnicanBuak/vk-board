export type CardStatus = 'default' | 'selected';

export interface Card {
  id: string;
  boardId: string;
  authorId: number;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  status: CardStatus;
  createdAt: string;
  likeCount: number;
  likedBy: number[];
}
