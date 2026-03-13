export type CardStatus = 'default' | 'selected';

export interface Tag {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string | null;
  authorId: number;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  status: CardStatus;
  order: number;
  createdAt: string;
  likeCount: number;
  likedBy: number[];
  tags: Tag[];
}

export interface Comment {
  id: string;
  cardId: string;
  userId: number;
  text: string;
  createdAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: string;
}
