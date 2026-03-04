import { useState, useCallback, useEffect } from 'react';
import { boardsApi } from '../api/boards';
import type { Board } from '../types/board';

interface State {
  boards: Board[];
  loading: boolean;
  error: string | null;
}

export function useBoards() {
  const [state, setState] = useState<State>({ boards: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const boards = await boardsApi.list();
      setState({ boards, loading: false, error: null });
    } catch (e) {
      setState({ boards: [], loading: false, error: (e as Error).message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBoard = useCallback(
    async (data: { title: string; description?: string }) => {
      const board = await boardsApi.create(data);
      setState((s) => ({ ...s, boards: [board, ...s.boards] }));
      return board;
    },
    [],
  );

  const deleteBoard = useCallback(async (id: string) => {
    await boardsApi.delete(id);
    setState((s) => ({ ...s, boards: s.boards.filter((b) => b.id !== id) }));
  }, []);

  return { ...state, refresh: load, createBoard, deleteBoard };
}
