import type { ColumnDto } from './column';
import type { TagDto } from './tag';

export type CardStatus = 'default' | 'selected';
export type CardSortMode = 'likes' | 'date';

export interface CardDto {
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
  tags: TagDto[];
}

export interface CardCreateInput {
  boardId: string;
  columnId?: string | null;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

export interface CardUpdateInput {
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  status?: CardStatus;
  columnId?: string | null;
  order?: number;
  assignees?: number[];
  dueDate?: string | null;
}

export interface CardViewState {
  card: CardDto;
  column: ColumnDto | null;
}
