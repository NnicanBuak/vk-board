import { useState, useCallback, useEffect } from 'react';
import { cardsApi, SortMode } from '../api/cards';
import { likesApi } from '../api/likes';
import type { Card } from '../types/card';

interface State {
  cards: Card[];
  loading: boolean;
  error: string | null;
}

export function useCards(boardId: string, sort: SortMode) {
  const [state, setState] = useState<State>({ cards: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const cards = await cardsApi.list(boardId, sort);
      setState({ cards, loading: false, error: null });
    } catch (e) {
      setState({ cards: [], loading: false, error: (e as Error).message });
    }
  }, [boardId, sort]);

  useEffect(() => { load(); }, [load]);

  const addCard = useCallback(
    async (data: { title: string; description?: string; url?: string }) => {
      const card = await cardsApi.create({ boardId, ...data });
      setState((s) => ({ ...s, cards: [card, ...s.cards] }));
      return card;
    },
    [boardId],
  );

  const updateCard = useCallback(
    async (id: string, data: Parameters<typeof cardsApi.update>[1]) => {
      const updated = await cardsApi.update(id, data);
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
