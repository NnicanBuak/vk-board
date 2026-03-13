import { useState, useEffect, useCallback } from 'react';
import { columnsApi } from '../api/columns';
import type { Column } from '../types/card';

export function useColumns(boardId: string) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await columnsApi.list(boardId);
      setColumns(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  const addColumn = useCallback(async (title: string) => {
    const col = await columnsApi.create({ boardId, title });
    setColumns((prev) => [...prev, col]);
    return col;
  }, [boardId]);

  const renameColumn = useCallback(async (id: string, title: string) => {
    const updated = await columnsApi.update(id, { title });
    setColumns((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const removeColumn = useCallback(async (id: string) => {
    await columnsApi.delete(id);
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { columns, loading, error, refresh: load, addColumn, renameColumn, removeColumn };
}
