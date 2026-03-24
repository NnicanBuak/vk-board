import type {
  CardDto,
  CardStatus as SharedCardStatus,
} from '../../shared/types/card';
import type { ColumnDto } from '../../shared/types/column';
import type { CommentDto } from '../../shared/types/comment';
import type { TagDto } from '../../shared/types/tag';

export type CardStatus = SharedCardStatus;

export type Tag = TagDto;
export type Column = ColumnDto;
export type Comment = CommentDto;

export type Card = CardDto & {
  assignees: number[];
  dueDate: string | null;
};
