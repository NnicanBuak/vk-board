import type {
  BoardEntity as PrismaBoardEntity,
  BoardRoleTypeEntity,
} from './prisma';

export type BoardPublicRoleEntity = BoardRoleTypeEntity;

export type {
  BoardEntity,
  BoardRoleEntity,
  BoardRoleTypeEntity,
  BoardTypeEntity,
} from './prisma';

export type BoardWithRoleEntity = PrismaBoardEntity & {
  myRole: BoardPublicRoleEntity;
};

export type BoardMemberEntity = {
  userId: number;
  role: BoardPublicRoleEntity;
};
