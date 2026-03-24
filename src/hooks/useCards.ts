import { useState, useCallback, useEffect } from 'react';
import { cardsApi, type SortMode } from '../api/cards';
import { likesApi } from '../api/likes';
import type { Card } from '../types/card';
import type { CardCreateInput, CardDto } from '../../shared/types/card';

/** Ensures fields added in later migrations always have safe defaults. */
type CardResponse = CardDto & Partial<Pick<Card, 'assignees' | 'dueDate'>>;

function normalizeCard(raw: CardResponse): Card {
  return {
    ...raw,
    assignees: raw.assignees ?? [],
    likedBy:   raw.likedBy   ?? [],
    tags:      raw.tags      ?? [],
    dueDate: raw.dueDate ?? null,
  };
}

interface State {
  cards: Card[];
  loading: boolean;
  error: string | null;
}

export function useCards(boardId: string, sort: SortMode) {
  const [state, setState] = useState<State>({ cards: [], loading: true, error: null });

  const load = useCallback(async () => {
    if (!boardId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const cards = (await cardsApi.list(boardId, sort)).map(normalizeCard);
      setState({ cards, loading: false, error: null });
    } catch (e) {
      setState({ cards: [], loading: false, error: (e as Error).message });
    }
  }, [boardId, sort]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const addCard = useCallback(
    async (data: Omit<CardCreateInput, 'boardId'>) => {
      const card = normalizeCard(await cardsApi.create({ boardId, ...data }));
      setState((s) => ({ ...s, cards: [...s.cards, card] }));
      return card;
    },
    [boardId],
  );

  const updateCard = useCallback(
    async (id: string, data: Parameters<typeof cardsApi.update>[1]) => {
      const updated = normalizeCard(await cardsApi.update(id, data));
      setState((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === id ? updated : c)),
      }));
    },
    [],
  );

  const removeCard = useCallback(async (id: string) => {
    await cardsApi.delete(id);
    setState((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) }));
  }, []);

  /** Optimistic like toggle: updates local state first, then syncs with server. */
  const toggleLike = useCallback(async (cardId: string, userId: number) => {
    setState((s) => ({
      ...s,
      cards: s.cards.map((c) => {
        if (c.id !== cardId) return c;
        const liked = c.likedBy.includes(userId);
        return {
          ...c,
          likeCount: liked ? c.likeCount - 1 : c.likeCount + 1,
          likedBy: liked ? c.likedBy.filter((id) => id !== userId) : [...c.likedBy, userId],
        };
      }),
    }));

    try {
      const isCurrentlyLiked = state.cards.find((c) => c.id === cardId)?.likedBy.includes(userId);
      const result = isCurrentlyLiked
        ? await likesApi.remove(cardId)
        : await likesApi.add(cardId);
      // Reconcile server likeCount
      setState((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === cardId ? { ...c, likeCount: result.likeCount } : c)),
      }));
    } catch {
      // Revert optimistic update on error
      load();
    }
  }, [state.cards, load]);

  return { ...state, refresh: load, addCard, updateCard, removeCard, toggleLike };
}
