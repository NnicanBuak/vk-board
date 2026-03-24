import type {
  Board,
  BoardRole,
  BoardRoleType as PrismaBoardRoleType,
  BoardType as PrismaBoardType,
  Card,
  CardStatus as PrismaCardStatus,
  Column,
  Comment,
  Tag,
} from '@prisma/client';

export type BoardEntity = Board;
export type BoardRoleEntity = BoardRole;
export type ColumnEntity = Column;
export type CardEntity = Card;
export type CommentEntity = Comment;
export type TagEntity = Tag;

export type BoardRoleTypeEntity = PrismaBoardRoleType;
export type BoardTypeEntity = PrismaBoardType;
export type CardStatusEntity = PrismaCardStatus;
