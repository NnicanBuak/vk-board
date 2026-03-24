import { BoardRoleType } from '@prisma/client';
import prisma from '../db';
import type { BoardEntity, BoardRoleEntity } from '../../types/entities/prisma';

export type BoardAccessRole = BoardRoleType;
export type BoardPublicRole = BoardAccessRole;
export type BoardVisibility = 'public' | 'private';

export interface BoardAccessContext {
  board: BoardEntity;
  membership: BoardRoleEntity | null;
  role: BoardPublicRole | null;
}

const BOARD_ACCESS_ROLES: BoardAccessRole[] = ['owner', 'admin', 'editor', 'viewer'];
const BOARD_ASSIGNABLE_ROLES: BoardAccessRole[] = ['editor', 'viewer'];
const BOARD_EDIT_ROLES = new Set<BoardPublicRole>(['owner', 'admin', 'editor']);
const BOARD_DETAILS_ROLES = new Set<BoardPublicRole>(['owner', 'admin']);
const BOARD_MANAGE_ROLES = new Set<BoardPublicRole>(['owner', 'admin']);
const BOARD_SETTINGS_ROLES = new Set<BoardPublicRole>(['owner']);
const BOARD_PROTECTED_ROLES = new Set<BoardPublicRole>(['owner']);

export function isBoardAccessRole(value: unknown): value is BoardAccessRole {
  return typeof value === 'string' && BOARD_ACCESS_ROLES.includes(value as BoardAccessRole);
}

export function isAssignableBoardRole(value: unknown): value is Exclude<BoardAccessRole, 'owner' | 'admin'> {
  return typeof value === 'string' && BOARD_ASSIGNABLE_ROLES.includes(value as BoardAccessRole);
}

export function isBoardVisibility(value: unknown): value is BoardVisibility {
  return value === 'public' || value === 'private';
}

export function normalizeBoardRole(role: BoardAccessRole | null | undefined): BoardPublicRole | null {
  if (!role) {
    return null;
  }

  return role;
}

export function resolveBoardRole(
  boardCreatorId: number,
  userId: number,
  role: BoardAccessRole | null | undefined,
): BoardPublicRole | null {
  if (userId === boardCreatorId) {
    return 'owner';
  }

  return normalizeBoardRole(role);
}

export function canViewBoard(role: BoardPublicRole | null | undefined): boolean {
  return role !== null && role !== undefined;
}

export function canOpenBoard(
  visibility: BoardVisibility,
  role: BoardPublicRole | null | undefined,
): boolean {
  return visibility === 'public' || canViewBoard(role);
}

export function canEditBoard(role: BoardPublicRole | null | undefined): boolean {
  return !!role && BOARD_EDIT_ROLES.has(role);
}

export function canManageBoardDetails(role: BoardPublicRole | null | undefined): boolean {
  return !!role && BOARD_DETAILS_ROLES.has(role);
}

export function canManageBoard(role: BoardPublicRole | null | undefined): boolean {
  return !!role && BOARD_MANAGE_ROLES.has(role);
}

export function canManageBoardMembers(role: BoardPublicRole | null | undefined): boolean {
  return !!role && BOARD_MANAGE_ROLES.has(role);
}

export function canManageBoardSettings(role: BoardPublicRole | null | undefined): boolean {
  return !!role && BOARD_SETTINGS_ROLES.has(role);
}

export function isProtectedMemberRole(role: BoardPublicRole): boolean {
  return BOARD_PROTECTED_ROLES.has(role);
}

export async function loadBoardContext(
  boardId: string,
  userId: number,
): Promise<BoardAccessContext | null> {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return null;
  }

  const membership = await prisma.boardRole.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });

  const role = resolveBoardRole(board.creatorId, userId, membership?.role);
  return { board, membership, role };
}
