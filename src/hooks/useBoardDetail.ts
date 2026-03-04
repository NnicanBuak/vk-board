import { useState, useCallback, useEffect } from 'react';
import { boardsApi } from '../api/boards';
import type { Board } from '../types/board';

export function useBoardDetail(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await boardsApi.get(boardId);
      setBoard(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  return { board, loading, error, refresh: load };
}
