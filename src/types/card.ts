import type {
  CardEntity,
  CardStatusServer,
  ColumnEntity,
  CommentEntity,
  TagEntity,
} from './prisma';

export type CardStatus = CardStatusServer;

export type Tag = TagEntity;
export type Column = ColumnEntity;
export type Comment = CommentEntity;

export type Card = CardEntity & {
  likeCount: number;
  likedBy: number[];
  tags: Tag[];
  assignees: number[];
  dueDate: string | null;
};
