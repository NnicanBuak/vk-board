import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

/** Resolve current user's role on a board. Returns null if not a member. */
async function getRole(boardId: string, userId: number) {
  const entry = await prisma.boardRole.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return entry?.role ?? null;
}

// GET /api/cards?boardId=&sort=likes|date
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { boardId, sort } = req.query as { boardId?: string; sort?: string };

  if (!boardId) {
    res.status(400).json({ error: 'boardId is required' });
    return;
  }

  const role = await getRole(boardId, userId);
  if (!role) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const cards = await prisma.card.findMany({
    where: { boardId },
    include: { likes: { select: { userId: true } } },
    orderBy: sort === 'likes' ? undefined : { createdAt: 'desc' },
  });

  const result = cards
    .map((c) => ({
      ...c,
      likeCount: c.likes.length,
      likedBy: c.likes.map((l) => l.userId),
      likes: undefined,
    }))
    .sort(sort === 'likes' ? (a, b) => b.likeCount - a.likeCount : () => 0);

  res.json(result);
});

// POST /api/cards
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { boardId, title, description, url, imageUrl } = req.body as {
    boardId?: string;
    title?: string;
    description?: string;
    url?: string;
    imageUrl?: string;
  };

  if (!boardId || !title?.trim()) {
    res.status(400).json({ error: 'boardId and title are required' });
    return;
  }

  const role = await getRole(boardId, userId);
  if (!role) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const card = await prisma.card.create({
    data: {
      boardId,
      authorId: userId,
      title: title.trim(),
      description: description?.trim() ?? null,
      url: url?.trim() ?? null,
      imageUrl: imageUrl?.trim() ?? null,
    },
  });

  res.status(201).json({ ...card, likeCount: 0, likedBy: [] });
});

// PATCH /api/cards/:id
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { title, description, url, imageUrl, status } = req.body as {
    title?: string;
    description?: string;
    url?: string;
    imageUrl?: string;
    status?: 'default' | 'selected';
  };

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const role = await getRole(card.boardId, userId);
  const isAuthor = card.authorId === userId;
  const isAdmin = role === 'admin';

  // Only author or admin can edit content; only admin can set status
  if (!isAuthor && !isAdmin) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (status !== undefined && !isAdmin) {
    res.status(403).json({ error: 'Only admin can change card status' });
    return;
  }

  const updated = await prisma.card.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() || null }),
      ...(url !== undefined && { url: url.trim() || null }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl.trim() || null }),
      ...(status !== undefined && { status }),
    },
    include: { likes: { select: { userId: true } } },
  });

  res.json({
    ...updated,
    likeCount: updated.likes.length,
    likedBy: updated.likes.map((l) => l.userId),
    likes: undefined,
  });
});

// DELETE /api/cards/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const role = await getRole(card.boardId, userId);
  if (card.authorId !== userId && role !== 'admin') {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.card.delete({ where: { id } });
  res.status(204).send();
});

export default router;
