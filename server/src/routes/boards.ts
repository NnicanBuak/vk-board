import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

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

// POST /api/boards — create board, assign creator as admin
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { title, description, chatId } = req.body as {
    title?: string;
    description?: string;
    chatId?: string;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
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
