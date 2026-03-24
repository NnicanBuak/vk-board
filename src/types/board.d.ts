import type {
  BoardDto,
  BoardRole as SharedBoardRole,
  BoardType as SharedBoardType,
  BoardVisibility as SharedBoardVisibility,
} from "../../shared/types/board";

export type BoardRole = SharedBoardRole;
export type BoardType = SharedBoardType;
export type BoardVisibility = SharedBoardVisibility;

export type Board = BoardDto;
