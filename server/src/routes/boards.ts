import { Router, Request, Response } from 'express';
import { BoardType } from '@prisma/client';
import prisma from '../db';
import { getAuthenticatedUser, requireAuth } from '../middleware/auth';
import type { PresenceUserProfile, PresenceUserPublic } from '../../../shared/types/presence';
import type { BoardMemberEntity, BoardWithRoleEntity } from '../../types/entities/board';
import type { PresenceUserRecord } from '../../types/entities/presence';

const router = Router();
router.use(requireAuth);

function isBoardType(value: unknown): value is BoardType {
  return Object.values(BoardType).includes(value as BoardType);
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

router.put('/:id/presence', (req: Request, res: Response): void => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };
  const {
    firstName = '',
    lastName = '',
    photo100 = '',
  } = req.body as Partial<PresenceUserProfile>;

  getBoardPresence(id).set(userId, {
    userId,
    firstName,
    lastName,
    photo100,
    ts: Date.now(),
  });

  res.status(204).send();
});

router.delete('/:id/presence', (req: Request, res: Response): void => {
  const { userId } = getAuthenticatedUser(req);
  boardPresence.get(req.params.id as string)?.delete(userId);
  res.status(204).send();
});

router.get('/:id/presence', (req: Request, res: Response): void => {
  const now = Date.now();
  const users: PresenceUserPublic[] = Array.from(boardPresence.get(req.params.id as string)?.values() ?? [])
    .filter((user) => now - user.ts < PRESENCE_TTL)
    .map(({ userId, firstName, lastName, photo100 }) => ({
      userId,
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

  const boards: BoardWithRoleEntity[] = roles.map((role) => ({ ...role.board, myRole: role.role }));
  res.json(boards);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { title, description, chatId, coverImage, boardType } = req.body as {
    title?: string;
    description?: string;
    chatId?: string;
    coverImage?: string;
    boardType?: string;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const resolvedType: BoardType = isBoardType(boardType) ? boardType : 'kanban';

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      coverImage: coverImage?.trim() || null,
      boardType: resolvedType,
      chatId: chatId ?? null,
      creatorId: userId,
      roles: {
        create: { userId, role: 'admin' },
      },
    },
  });

  res.status(201).json({ ...board, myRole: 'admin' } as BoardWithRoleEntity);
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  const role = await prisma.boardRole.upsert({
    where: { boardId_userId: { boardId: id, userId } },
    create: { boardId: id, userId, role: 'member' },
    update: {},
  });

  res.json({ ...board, myRole: role.role } as BoardWithRoleEntity);
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };
  const { title, description, coverImage, boardType } = req.body as {
    title?: string;
    description?: string;
    coverImage?: string;
    boardType?: string;
  };

  const role = await prisma.boardRole.findUnique({
    where: { boardId_userId: { boardId: id, userId } },
  });

  if (!role || role.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can update the board' });
    return;
  }

  type BoardUpdatePayload = {
    title?: string;
    description?: string | null;
    coverImage?: string | null;
    boardType?: BoardType;
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

  if (boardType !== undefined && isBoardType(boardType)) {
    data.boardType = boardType;
  }

  const board = await prisma.board.update({ where: { id }, data });
  res.json({ ...board, myRole: role.role });
});

router.get('/:id/members', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const roles = await prisma.boardRole.findMany({
    where: { boardId: id },
    select: { userId: true, role: true },
  });

  const members: BoardMemberEntity[] = roles;
  res.json(members);
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params as { id: string };

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (board.creatorId !== userId) {
    res.status(403).json({ error: 'Only the board creator can delete it' });
    return;
  }

  await prisma.board.delete({ where: { id } });
  res.status(204).send();
});

export default router;
