import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// POST /api/likes — add like
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { cardId } = req.body as { cardId?: string };

  if (!cardId) {
    res.status(400).json({ error: 'cardId is required' });
    return;
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  try {
    await prisma.like.create({ data: { cardId, userId } });
  } catch {
    // Unique constraint violation — already liked, treat as idempotent
    res.status(200).json({ message: 'Already liked' });
    return;
  }

  const likeCount = await prisma.like.count({ where: { cardId } });
  res.status(201).json({ likeCount });
});

// DELETE /api/likes — remove like
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { cardId } = req.body as { cardId?: string };

  if (!cardId) {
    res.status(400).json({ error: 'cardId is required' });
    return;
  }

  await prisma.like.deleteMany({ where: { cardId, userId } });

  const likeCount = await prisma.like.count({ where: { cardId } });
  res.json({ likeCount });
});

export default router;
