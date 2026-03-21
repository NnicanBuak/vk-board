import type {
  Prisma,
  BoardType as PrismaBoardType,
  BoardRoleType as PrismaBoardRoleType,
  CardStatus as PrismaCardStatus,
} from '@prisma/client';

type JsonPrimitive = string | number | boolean | null;

type Jsonify<T> =
  T extends Date ? string
    : T extends bigint ? string
      : T extends Uint8Array ? string
        : T extends JsonPrimitive ? T
          : T extends (infer U)[] ? Jsonify<U>[]
            : T extends object ? { [K in keyof T]: Jsonify<T[K]> }
              : T;

export type BoardEntity = Jsonify<Prisma.Board>;
export type ColumnEntity = Jsonify<Prisma.Column>;
export type CardEntity = Jsonify<Prisma.Card>;
export type CommentEntity = Jsonify<Prisma.Comment>;
export type TagEntity = Jsonify<Prisma.Tag>;

export type BoardRoleServer = PrismaBoardRoleType;
export type BoardTypeServer = PrismaBoardType;
export type CardStatusServer = PrismaCardStatus;

export type BoardWithRole = BoardEntity & { myRole: BoardRoleServer };
