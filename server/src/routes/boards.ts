import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── In-memory presence store ──────────────────────────────────────────────────
type PresenceUser = { userId: number; firstName: string; lastName: string; photo100: string; ts: number };
const boardPresence = new Map<string, Map<number, PresenceUser>>();
const PRESENCE_TTL = 90_000; // 90 s

// PUT /api/boards/:id/presence — heartbeat (upsert)
router.put('/:id/presence', (req: Request, res: Response): void => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { firstName = '', lastName = '', photo100 = '' } = req.body as Partial<PresenceUser>;
  if (!boardPresence.has(id)) boardPresence.set(id, new Map());
  boardPresence.get(id)!.set(userId, { userId, firstName, lastName, photo100, ts: Date.now() });
  res.status(204).send();
});

// DELETE /api/boards/:id/presence — leave
router.delete('/:id/presence', (req: Request, res: Response): void => {
  const userId = req.user!.userId;
  boardPresence.get(req.params.id)?.delete(userId);
  res.status(204).send();
});

// GET /api/boards/:id/presence — current viewers
router.get('/:id/presence', (req: Request, res: Response): void => {
  const now = Date.now();
  const users = Array.from(boardPresence.get(req.params.id)?.values() ?? [])
    .filter((u) => now - u.ts < PRESENCE_TTL)
    .map(({ userId, firstName, lastName, photo100 }) => ({ userId, firstName, lastName, photo100 }));
  res.json(users);
});
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/boards — boards where current user has a role
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const roles = await prisma.boardRole.findMany({
    where: { userId },
    include: { board: true },
    orderBy: { board: { createdAt: 'desc' } },
  });

  const boards = roles.map((r) => ({ ...r.board, myRole: r.role }));
  res.json(boards);
});

const VALID_BOARD_TYPES = ['voting', 'kanban', 'brainstorm', 'retro'];

// POST /api/boards — create board, assign creator as admin
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
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

  const resolvedType = VALID_BOARD_TYPES.includes(boardType ?? '') ? (boardType as any) : 'voting';

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

  res.status(201).json({ ...board, myRole: 'admin' });
});

// GET /api/boards/:id — board details + current user role
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  // Auto-join as member if not already a member
  const role = await prisma.boardRole.upsert({
    where: { boardId_userId: { boardId: id, userId } },
    create: { boardId: id, userId, role: 'member' },
    update: {},
  });

  res.json({ ...board, myRole: role.role });
});

// PATCH /api/boards/:id — update fields, only admin allowed
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;
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

  const data: Record<string, any> = {};
  if (title !== undefined) {
    if (!title.trim()) { res.status(400).json({ error: 'title cannot be empty' }); return; }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description.trim() || null;
  if (coverImage !== undefined) data.coverImage = coverImage.trim() || null;
  if (boardType !== undefined && VALID_BOARD_TYPES.includes(boardType)) data.boardType = boardType;

  const board = await prisma.board.update({ where: { id }, data });
  res.json({ ...board, myRole: role.role });
});

// GET /api/boards/:id/members — list of users with roles
router.get('/:id/members', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const roles = await prisma.boardRole.findMany({
    where: { boardId: id },
    select: { userId: true, role: true },
  });
  res.json(roles);
});

// DELETE /api/boards/:id — only creator (admin) can delete
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

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
