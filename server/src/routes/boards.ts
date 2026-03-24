import { Router, Request, Response } from 'express';
import { BoardType } from '@prisma/client';
import prisma from '../db';
import { getAuthenticatedUser, requireAuth } from '../middleware/auth';
import type { PresenceUserProfile, PresenceUserPublic } from '../../../shared/types/presence';
import type { BoardEntity, BoardMemberEntity, BoardWithRoleEntity } from '../../types/entities/board';
import type { PresenceUserRecord } from '../../types/entities/presence';
import {
  canManageBoardDetails,
  canManageBoardMembers,
  canManageBoardSettings,
  canOpenBoard,
  isAssignableBoardRole,
  isBoardVisibility,
  loadBoardContext,
  resolveBoardRole,
} from '../lib/boardAccess';
import type { BoardVisibility } from '../lib/boardAccess';

const router = Router();
router.use(requireAuth);

function isBoardType(value: unknown): value is BoardType {
  return Object.values(BoardType).includes(value as BoardType);
}

function toBoardWithRoleEntity(
  board: BoardEntity,
  myRole: BoardWithRoleEntity['myRole'],
): BoardWithRoleEntity {
  return { ...board, myRole };
}

const boardPresence = new Map<string, Map<number, PresenceUserRecord>>();
const PRESENCE_TTL = 90_000;

function getBoardPresence(boardId: string): Map<number, PresenceUserRecord> {
  const existing = boardPresence.get(boardId);
  if (existing) {
    return existing;
  }

  const created = new Map<number, PresenceUserRecord>();
  boardPresence.set(boardId, created);
  return created;
}

async function ensureBoardAccess(boardId: string, userId: number) {
  const context = await loadBoardContext(boardId, userId);
  if (!context) {
    return null;
  }

  if (context.board.creatorId === userId && !context.membership) {
    const role = await prisma.boardRole.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, role: 'owner' },
      update: { role: 'owner' },
    });

    return { ...context, role: resolveBoardRole(context.board.creatorId, userId, role.role) };
  }

  if (context.board.visibility === 'public' && !context.membership) {
    const role = await prisma.boardRole.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, role: 'viewer' },
      update: {},
    });

    return { ...context, role: resolveBoardRole(context.board.creatorId, userId, role.role) };
  }

  if (canOpenBoard(context.board.visibility, context.role)) {
    return context;
  }

  return null;
}

router.put('/:id/presence', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };
  const {
    firstName = '',
    lastName = '',
    photo100 = '',
  } = req.body as Partial<PresenceUserProfile>;

  const access = await ensureBoardAccess(id, userId);
  if (!access) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  getBoardPresence(id).set(userId, {
    userId,
    firstName,
    lastName,
    photo100,
    ts: Date.now(),
  });

  res.status(204).send();
});

router.delete('/:id/presence', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const access = await ensureBoardAccess(id, userId);
  if (!access) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  boardPresence.get(id)?.delete(userId);
  res.status(204).send();
});

router.get('/:id/presence', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const access = await ensureBoardAccess(id, userId);
  if (!access) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const now = Date.now();
  const users: PresenceUserPublic[] = Array.from(boardPresence.get(id)?.values() ?? [])
    .filter((user) => now - user.ts < PRESENCE_TTL)
    .map(({ userId: presenceUserId, firstName, lastName, photo100 }) => ({
      userId: presenceUserId,
      firstName,
      lastName,
      photo100,
    }));

  res.json(users);
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);

  const roles = await prisma.boardRole.findMany({
    where: { userId },
    include: { board: true },
    orderBy: { board: { createdAt: 'desc' } },
  });

  const boards: BoardWithRoleEntity[] = roles.map((role) =>
    toBoardWithRoleEntity(
      role.board,
      resolveBoardRole(role.board.creatorId, userId, role.role) ?? 'viewer',
    ),
  );

  res.json(boards);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const {
    title,
    description,
    chatId,
    coverImage,
    boardType,
    visibility,
  } = req.body as {
    title?: string;
    description?: string;
    chatId?: string;
    coverImage?: string;
    boardType?: string;
    visibility?: string;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const resolvedType: BoardType = isBoardType(boardType) ? boardType : 'kanban';
  const resolvedVisibility = isBoardVisibility(visibility) ? visibility : 'private';

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      coverImage: coverImage?.trim() || null,
      boardType: resolvedType,
      visibility: resolvedVisibility,
      chatId: chatId ?? null,
      creatorId: userId,
      roles: {
        create: { userId, role: 'owner' },
      },
    },
  });

  res.status(201).json(toBoardWithRoleEntity(board, 'owner'));
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  let role = context.role;
  if (!role) {
    const membership = await prisma.boardRole.upsert({
      where: { boardId_userId: { boardId: id, userId } },
      create: { boardId: id, userId, role: 'viewer' },
      update: {},
    });

    role = resolveBoardRole(context.board.creatorId, userId, membership.role) ?? 'viewer';
  } else if (role === 'owner' && !context.membership) {
    await prisma.boardRole.upsert({
      where: { boardId_userId: { boardId: id, userId } },
      create: { boardId: id, userId, role: 'owner' },
      update: { role: 'owner' },
    });
  }

  res.json(toBoardWithRoleEntity(context.board, role));
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };
  const {
    title,
    description,
    coverImage,
    boardType,
    visibility,
  } = req.body as {
    title?: string;
    description?: string;
    coverImage?: string;
    boardType?: string;
    visibility?: string;
  };

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  const canEditBoardDetails = canManageBoardDetails(context.role);
  const wantsVisibilityChange = visibility !== undefined;
  const wantsBoardDetailsChange =
    title !== undefined ||
    description !== undefined ||
    coverImage !== undefined ||
    boardType !== undefined;

  if (wantsBoardDetailsChange && !canEditBoardDetails) {
    res.status(403).json({ error: 'Only the board owner or admin can update the board' });
    return;
  }

  if (wantsVisibilityChange && !canManageBoardSettings(context.role)) {
    res.status(403).json({ error: 'Only the board owner can change board visibility' });
    return;
  }

  type BoardUpdatePayload = {
    title?: string;
    description?: string | null;
    coverImage?: string | null;
    boardType?: BoardType;
    visibility?: BoardVisibility;
  };

  const data: BoardUpdatePayload = {};
  if (title !== undefined) {
    if (!title.trim()) {
      res.status(400).json({ error: 'title cannot be empty' });
      return;
    }

    data.title = title.trim();
  }

  if (description !== undefined) {
    data.description = description.trim() || null;
  }

  if (coverImage !== undefined) {
    data.coverImage = coverImage.trim() || null;
  }

  if (boardType !== undefined) {
    if (!isBoardType(boardType)) {
      res.status(400).json({ error: 'Invalid boardType' });
      return;
    }

    data.boardType = boardType;
  }

  if (visibility !== undefined) {
    if (!isBoardVisibility(visibility)) {
      res.status(400).json({ error: 'Invalid visibility' });
      return;
    }

    data.visibility = visibility;
  }

  const board = await prisma.board.update({ where: { id }, data });
  res.json(toBoardWithRoleEntity(board, context.role ?? 'owner'));
});

router.get('/:id/members', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const roles = await prisma.boardRole.findMany({
    where: { boardId: id },
    select: { userId: true, role: true },
  });

  const members: BoardMemberEntity[] = roles.map((role) => ({
    userId: role.userId,
    role: resolveBoardRole(context.board.creatorId, role.userId, role.role) ?? 'viewer',
  }));

  res.json(members);
});

router.post('/:id/members', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };
  const { userId: targetUserIdRaw, role } = req.body as {
    userId?: number;
    role?: string;
  };
  const targetUserId = Number(targetUserIdRaw);

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoardMembers(context.role)) {
    res.status(403).json({ error: 'Only the board owner or admin can manage members' });
    return;
  }

  if (!Number.isInteger(targetUserId)) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  if (!isAssignableBoardRole(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  if (targetUserId === userId || targetUserId === context.board.creatorId) {
    res.status(403).json({ error: 'Owner cannot be changed' });
    return;
  }

  const boardRole = await prisma.boardRole.upsert({
    where: { boardId_userId: { boardId: id, userId: targetUserId } },
    create: { boardId: id, userId: targetUserId, role },
    update: { role },
  });

  res.status(201).json({
    userId: boardRole.userId,
    role: resolveBoardRole(context.board.creatorId, boardRole.userId, boardRole.role) ?? boardRole.role,
  });
});

router.patch('/:id/members/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id, userId: targetUserIdRaw } = req.params as { id: string; userId: string };
  const targetUserId = Number(targetUserIdRaw);
  const { role } = req.body as { role?: string };

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoardMembers(context.role)) {
    res.status(403).json({ error: 'Only the board owner or admin can manage members' });
    return;
  }

  if (!Number.isInteger(targetUserId)) {
    res.status(400).json({ error: 'Invalid userId' });
    return;
  }

  if (!isAssignableBoardRole(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  if (targetUserId === context.board.creatorId || targetUserId === userId) {
    res.status(403).json({ error: 'Owner cannot be changed' });
    return;
  }

  const existing = await prisma.boardRole.findUnique({
    where: { boardId_userId: { boardId: id, userId: targetUserId } },
  });

  if (!existing) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const boardRole = await prisma.boardRole.update({
    where: { boardId_userId: { boardId: id, userId: targetUserId } },
    data: { role },
  });

  res.json({
    userId: boardRole.userId,
    role: resolveBoardRole(context.board.creatorId, boardRole.userId, boardRole.role) ?? boardRole.role,
  });
});

router.delete('/:id/members/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id, userId: targetUserIdRaw } = req.params as { id: string; userId: string };
  const targetUserId = Number(targetUserIdRaw);

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoardMembers(context.role)) {
    res.status(403).json({ error: 'Only the board owner or admin can manage members' });
    return;
  }

  if (!Number.isInteger(targetUserId)) {
    res.status(400).json({ error: 'Invalid userId' });
    return;
  }

  if (targetUserId === context.board.creatorId || targetUserId === userId) {
    res.status(403).json({ error: 'Owner cannot be changed' });
    return;
  }

  await prisma.boardRole.deleteMany({
    where: { boardId: id, userId: targetUserId },
  });

  res.status(204).send();
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const context = await loadBoardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoardSettings(context.role)) {
    res.status(403).json({ error: 'Only the board owner can delete it' });
    return;
  }

  await prisma.board.delete({ where: { id } });
  res.status(204).send();
});

export default router;
