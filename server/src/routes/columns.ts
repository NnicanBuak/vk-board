import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireUser } from '../middleware/auth';
import type { ColumnEntity } from '../../types/entities/column';
import { canManageBoard, canOpenBoard, loadBoardContext } from '../lib/boardAccess';

const router = Router();
router.use(requireAuth);

// GET /api/columns?boardId=
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { boardId } = req.query as { boardId?: string };

  if (!boardId) {
    res.status(400).json({ error: 'boardId is required' });
    return;
  }

  const context = await loadBoardContext(boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const columns: ColumnEntity[] = await prisma.column.findMany({
    where: { boardId },
    orderBy: { order: 'asc' },
  });

  res.json(columns);
});

// POST /api/columns — board manager only
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { boardId, title } = req.body as { boardId?: string; title?: string };

  if (!boardId || !title?.trim()) {
    res.status(400).json({ error: 'boardId and title are required' });
    return;
  }

  const context = await loadBoardContext(boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoard(context.role)) {
    res.status(403).json({ error: 'Only board owners and admins can manage columns' });
    return;
  }

  const last = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: 'desc' },
  });

  const column: ColumnEntity = await prisma.column.create({
    data: { boardId, title: title.trim(), order: (last?.order ?? -1) + 1 },
  });

  res.status(201).json(column);
});

// PATCH /api/columns/:id — rename or reorder (board manager only)
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { id } = req.params as { id: string };
  const { title, order } = req.body as { title?: string; order?: number };

  const column = await prisma.column.findUnique({ where: { id } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }

  const context = await loadBoardContext(column.boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoard(context.role)) {
    res.status(403).json({ error: 'Only board owners and admins can manage columns' });
    return;
  }

  const updated: ColumnEntity = await prisma.column.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(order !== undefined && { order }),
    },
  });

  res.json(updated);
});

// DELETE /api/columns/:id — board manager only, cards move to null column
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { id } = req.params as { id: string };

  const column = await prisma.column.findUnique({ where: { id } });
  if (!column) {
    res.status(404).json({ error: 'Column not found' });
    return;
  }

  const context = await loadBoardContext(column.boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoard(context.role)) {
    res.status(403).json({ error: 'Only board owners and admins can manage columns' });
    return;
  }

  await prisma.column.delete({ where: { id } });
  res.status(204).send();
});

export default router;
