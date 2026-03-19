import { useState, useCallback, useEffect } from 'react';
import { boardsApi } from '../api/boards';
import type { Board } from '../types/board';
import { cacheGet, cacheSet } from '../lib/boardCache';

export function useBoardDetail(boardId: string) {
  const cacheKey = `board:${boardId}`;
  const cached = cacheGet<Board>(cacheKey);

  const [board, setBoard] = useState<Board | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const hit = cacheGet<Board>(cacheKey);
    if (hit) {
      setBoard(hit);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await boardsApi.get(boardId);
      setBoard(data);
      setError(null);
      cacheSet(cacheKey, data);
    } catch (e) {
      if (!hit) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  const renameBoard = useCallback(async (newTitle: string) => {
    if (!board || !newTitle.trim() || newTitle.trim() === board.title) return;
    const prev = board;
    setBoard({ ...board, title: newTitle.trim() });
    try {
      const updated = await boardsApi.update(boardId, { title: newTitle.trim() });
      setBoard(updated);
      cacheSet(cacheKey, updated);
    } catch (e) {
      setBoard(prev);
      setError((e as Error).message);
    }
  }, [board, boardId]);

  const updateBoard = useCallback(async (data: { title?: string; description?: string; coverImage?: string; boardType?: string; visibility?: string; groupId?: string | null }) => {
    if (!board) return;
    const prev = board;
    setBoard({ ...board, ...data } as Board);
    try {
      const updated = await boardsApi.update(boardId, data);
      setBoard(updated);
      cacheSet(cacheKey, updated);
    } catch (e) {
      setBoard(prev);
      throw e;
    }
  }, [board, boardId]);

  return { board, loading, error, refresh: load, renameBoard, updateBoard };
}
