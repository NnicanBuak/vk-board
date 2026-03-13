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

// GET /api/tags?boardId=
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { boardId } = req.query as { boardId?: string };

  if (!boardId) { res.status(400).json({ error: 'boardId is required' }); return; }

  const role = await getRole(boardId, userId);
  if (!role) { res.status(403).json({ error: 'Access denied' }); return; }

  const tags = await prisma.tag.findMany({
    where: { boardId },
    orderBy: { name: 'asc' },
  });

  res.json(tags);
});

// POST /api/tags — admin creates a tag on the board
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { boardId, name, color } = req.body as { boardId?: string; name?: string; color?: string };

  if (!boardId || !name?.trim()) {
    res.status(400).json({ error: 'boardId and name are required' });
    return;
  }

  const role = await getRole(boardId, userId);
  if (role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const tag = await prisma.tag.upsert({
    where: { boardId_name: { boardId, name: name.trim() } },
    create: { boardId, name: name.trim(), color: color ?? '#6c757d' },
    update: { color: color ?? '#6c757d' },
  });

  res.status(201).json(tag);
});

// DELETE /api/tags/:id — admin only
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) { res.status(404).json({ error: 'Tag not found' }); return; }

  const role = await getRole(tag.boardId, userId);
  if (role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  await prisma.tag.delete({ where: { id } });
  res.status(204).send();
});

// POST /api/tags/assign — add tag to card
router.post('/assign', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { cardId, tagId } = req.body as { cardId?: string; tagId?: string };

  if (!cardId || !tagId) {
    res.status(400).json({ error: 'cardId and tagId are required' });
    return;
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

  const role = await getRole(card.boardId, userId);
  if (!role) { res.status(403).json({ error: 'Access denied' }); return; }

  await prisma.cardTag.upsert({
    where: { cardId_tagId: { cardId, tagId } },
    create: { cardId, tagId },
    update: {},
  });

  res.status(201).json({ cardId, tagId });
});

// DELETE /api/tags/assign — remove tag from card
router.delete('/assign', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { cardId, tagId } = req.body as { cardId?: string; tagId?: string };

  if (!cardId || !tagId) {
    res.status(400).json({ error: 'cardId and tagId are required' });
    return;
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

  const role = await getRole(card.boardId, userId);
  if (!role) { res.status(403).json({ error: 'Access denied' }); return; }

  await prisma.cardTag.deleteMany({ where: { cardId, tagId } });
  res.status(204).send();
});

export default router;
