import type {
  CardEntity as PrismaCardEntity,
  TagEntity,
} from './prisma';

export type {
  CardEntity,
  CardStatusEntity,
} from './prisma';

export type CardWithMetaEntity = PrismaCardEntity & {
  likeCount: number;
  likedBy: number[];
  tags: TagEntity[];
};
