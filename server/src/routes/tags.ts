import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireUser } from '../middleware/auth';
import type { TagAssignResponse } from '../../../shared/types/tag';
import type { TagEntity } from '../../types/entities/tag';
import { canEditBoard, canManageBoard, canOpenBoard, loadBoardContext } from '../lib/boardAccess';

const router = Router();
router.use(requireAuth);

async function getCardContext(cardId: string, userId: number) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    return null;
  }

  const context = await loadBoardContext(card.boardId, userId);
  if (!context) {
    return null;
  }

  return { card, ...context };
}

// GET /api/tags?boardId=
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

  const tags: TagEntity[] = await prisma.tag.findMany({
    where: { boardId },
    orderBy: { name: 'asc' },
  });

  res.json(tags);
});

// POST /api/tags — board manager creates a tag on the board
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { boardId, name, color } = req.body as { boardId?: string; name?: string; color?: string };

  if (!boardId || !name?.trim()) {
    res.status(400).json({ error: 'boardId and name are required' });
    return;
  }

  const context = await loadBoardContext(boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoard(context.role)) {
    res.status(403).json({ error: 'Only board owners and admins can manage tags' });
    return;
  }

  const tag: TagEntity = await prisma.tag.upsert({
    where: { boardId_name: { boardId, name: name.trim() } },
    create: { boardId, name: name.trim(), color: color ?? '#6c757d' },
    update: { color: color ?? '#6c757d' },
  });

  res.status(201).json(tag);
});

// DELETE /api/tags/:id — board manager only
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { id } = req.params as { id: string };

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  const context = await loadBoardContext(tag.boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canManageBoard(context.role)) {
    res.status(403).json({ error: 'Only board owners and admins can manage tags' });
    return;
  }

  await prisma.tag.delete({ where: { id } });
  res.status(204).send();
});

// POST /api/tags/assign — add tag to card
router.post('/assign', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { cardId, tagId } = req.body as { cardId?: string; tagId?: string };

  if (!cardId || !tagId) {
    res.status(400).json({ error: 'cardId and tagId are required' });
    return;
  }

  const context = await getCardContext(cardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (!canEditBoard(context.role) && context.card.authorId !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.cardTag.upsert({
    where: { cardId_tagId: { cardId, tagId } },
    create: { cardId, tagId },
    update: {},
  });

  const result: TagAssignResponse = { cardId, tagId };
  res.status(201).json(result);
});

// DELETE /api/tags/assign — remove tag from card
router.delete('/assign', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { cardId, tagId } = req.body as { cardId?: string; tagId?: string };

  if (!cardId || !tagId) {
    res.status(400).json({ error: 'cardId and tagId are required' });
    return;
  }

  const context = await getCardContext(cardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  if (!canOpenBoard(context.board.visibility, context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (!canEditBoard(context.role) && context.card.authorId !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.cardTag.deleteMany({ where: { cardId, tagId } });
  res.status(204).send();
});

export default router;
