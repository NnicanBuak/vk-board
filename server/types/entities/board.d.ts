import type {
  BoardEntity as PrismaBoardEntity,
  BoardRoleTypeEntity,
} from './prisma';

export type {
  BoardEntity,
  BoardRoleEntity,
  BoardRoleTypeEntity,
  BoardTypeEntity,
} from './prisma';

export type BoardWithRoleEntity = PrismaBoardEntity & {
  myRole: BoardRoleTypeEntity;
};

export type BoardMemberEntity = {
  userId: number;
  role: BoardRoleTypeEntity;
};
