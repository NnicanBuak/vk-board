import { useState, useCallback, useEffect } from 'react';
import { boardsApi } from '../api/boards';
import type { Board } from '../types/board';
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/boardCache';
import type { BoardCreateInput } from '../../shared/types/board';

const CACHE_KEY = 'boards';

interface State {
  boards: Board[];
  loading: boolean;
  error: string | null;
}

export function useBoards() {
  const cached = cacheGet<Board[]>(CACHE_KEY);
  const [state, setState] = useState<State>(
    cached
      ? { boards: cached, loading: false, error: null }
      : { boards: [], loading: true, error: null },
  );

  const load = useCallback(async () => {
    const hit = cacheGet<Board[]>(CACHE_KEY);
    if (hit) {
      setState({ boards: hit, loading: false, error: null });
    } else {
      setState((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const boards = await boardsApi.list();
      setState({ boards, loading: false, error: null });
      cacheSet(CACHE_KEY, boards);
    } catch (e) {
      if (!hit) {
        setState({ boards: [], loading: false, error: (e as Error).message });
      }
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const createBoard = useCallback(
    async (data: BoardCreateInput) => {
      const board = await boardsApi.create(data);
      cacheInvalidate(CACHE_KEY);
      setState((s) => ({ ...s, boards: [board, ...s.boards] }));
      return board;
    },
    [],
  );

  const deleteBoard = useCallback(async (id: string) => {
    await boardsApi.delete(id);
    cacheInvalidate(CACHE_KEY);
    cacheInvalidate(`board:${id}`);
    setState((s) => ({ ...s, boards: s.boards.filter((b) => b.id !== id) }));
  }, []);

  return { ...state, refresh: load, createBoard, deleteBoard };
}
