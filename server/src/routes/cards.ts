import { Router, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../db';
import { requireAuth, requireUser } from '../middleware/auth';
import type { CardWithMetaEntity } from '../../types/entities/card';
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

  return { ...context, card };
}

const cardInclude = {
  likes: { select: { userId: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.CardInclude;

type CardWithRelations = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

function formatCard(c: CardWithRelations): CardWithMetaEntity {
  const { likes, tags, ...rest } = c;
  return {
    ...rest,
    likeCount: likes.length,
    likedBy: likes.map((l) => l.userId),
    tags: tags?.map((ct) => ct.tag) ?? [],
  };
}

// GET /api/cards?boardId=&sort=likes|date&columnId=
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { boardId, sort, columnId } = req.query as {
    boardId?: string;
    sort?: string;
    columnId?: string;
  };

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

  const cards = await prisma.card.findMany({
    where: {
      boardId,
      ...(columnId !== undefined
        ? { columnId: columnId === 'null' ? null : columnId }
        : {}),
    },
    include: cardInclude,
    orderBy: sort === 'likes' ? undefined : [{ order: 'asc' }, { createdAt: 'desc' }],
  });

  const result = cards
    .map(formatCard)
    .sort(sort === 'likes' ? (a, b) => b.likeCount - a.likeCount : () => 0);

  res.json(result);
});

// POST /api/cards
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { boardId, columnId, title, description, url, imageUrl } = req.body as {
    boardId?: string;
    columnId?: string;
    title?: string;
    description?: string;
    url?: string;
    imageUrl?: string;
  };

  if (!boardId || !title?.trim()) {
    res.status(400).json({ error: 'boardId and title are required' });
    return;
  }

  const context = await loadBoardContext(boardId, userId);
  if (!context) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!canEditBoard(context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const last = await prisma.card.findFirst({
    where: { boardId, columnId: columnId ?? null },
    orderBy: { order: 'desc' },
  });

  const card = await prisma.card.create({
    data: {
      boardId,
      columnId: columnId ?? null,
      authorId: userId,
      title: title.trim(),
      description: description?.trim() ?? null,
      url: url?.trim() ?? null,
      imageUrl: imageUrl?.trim() ?? null,
      order: (last?.order ?? -1) + 1,
    },
    include: cardInclude,
  });

  res.status(201).json(formatCard(card));
});

// PATCH /api/cards/:id
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { id } = req.params as { id: string };
  const { title, description, url, imageUrl, status, columnId, order } = req.body as {
    title?: string;
    description?: string;
    url?: string;
    imageUrl?: string;
    status?: 'default' | 'selected';
    columnId?: string | null;
    order?: number;
  };

  const context = await getCardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const isAuthor = context.card.authorId === userId;
  const canEditCard = isAuthor || canEditBoard(context.role);

  if (!canEditCard) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (status !== undefined && !canManageBoard(context.role)) {
    res.status(403).json({ error: 'Only board owners and admins can change card status' });
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
      ...(columnId !== undefined && { columnId }),
      ...(order !== undefined && { order }),
    },
    include: cardInclude,
  });

  res.json(formatCard(updated));
});

// DELETE /api/cards/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  const userId = user.userId;
  const { id } = req.params as { id: string };

  const context = await getCardContext(id, userId);
  if (!context) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  if (context.card.authorId !== userId && !canManageBoard(context.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.card.delete({ where: { id } });
  res.status(204).send();
});

export default router;
