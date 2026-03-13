import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function getRole(boardId: string, userId: number) {
  const entry = await prisma.boardRole.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return entry?.role ?? null;
}

// GET /api/columns?boardId=
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { boardId } = req.query as { boardId?: string };

  if (!boardId) { res.status(400).json({ error: 'boardId is required' }); return; }

  const role = await getRole(boardId, userId);
  if (!role) { res.status(403).json({ error: 'Access denied' }); return; }

  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { order: 'asc' },
  });

  res.json(columns);
});

// POST /api/columns — admin only
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { boardId, title } = req.body as { boardId?: string; title?: string };

  if (!boardId || !title?.trim()) {
    res.status(400).json({ error: 'boardId and title are required' });
    return;
  }

  const role = await getRole(boardId, userId);
  if (role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const last = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: 'desc' },
  });

  const column = await prisma.column.create({
    data: { boardId, title: title.trim(), order: (last?.order ?? -1) + 1 },
  });

  res.status(201).json(column);
});

// PATCH /api/columns/:id — rename or reorder (admin only)
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };
  const { title, order } = req.body as { title?: string; order?: number };

  const column = await prisma.column.findUnique({ where: { id } });
  if (!column) { res.status(404).json({ error: 'Column not found' }); return; }

  const role = await getRole(column.boardId, userId);
  if (role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const updated = await prisma.column.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(order !== undefined && { order }),
    },
  });

  res.json(updated);
});

// DELETE /api/columns/:id — admin only, cards move to null column
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const column = await prisma.column.findUnique({ where: { id } });
  if (!column) { res.status(404).json({ error: 'Column not found' }); return; }

  const role = await getRole(column.boardId, userId);
  if (role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  await prisma.column.delete({ where: { id } });
  res.status(204).send();
});

export default router;
