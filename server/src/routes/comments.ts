import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireUser } from '../middleware/auth';
import type { CommentEntity } from '../../types/entities/comment';
import { canManageBoard, canOpenBoard, loadBoardContext } from '../lib/boardAccess';

const router = Router();
router.use(requireAuth);

// GET /api/comments?cardId=
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { cardId } = req.query as { cardId?: string };

  if (!cardId) {
    res.status(400).json({ error: 'cardId is required' });
    return;
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const context = await loadBoardContext(card.boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const comments: CommentEntity[] = await prisma.comment.findMany({
    where: { cardId },
    orderBy: { createdAt: 'asc' },
  });

  res.json(comments);
});

// POST /api/comments
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { cardId, text } = req.body as { cardId?: string; text?: string };

  if (!cardId || !text?.trim()) {
    res.status(400).json({ error: 'cardId and text are required' });
    return;
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const context = await loadBoardContext(card.boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const comment: CommentEntity = await prisma.comment.create({
    data: { cardId, userId, text: text.trim() },
  });

  res.status(201).json(comment);
});

// DELETE /api/comments/:id — author or board manager
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { id } = req.params as { id: string };

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { card: true },
  });
  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  const context = await loadBoardContext(comment.card.boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (comment.userId !== userId && !canManageBoard(context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
});

export default router;
