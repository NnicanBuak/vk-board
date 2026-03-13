import { useState, useEffect, useCallback } from 'react';
import { commentsApi } from '../api/comments';
import type { Comment } from '../types/card';

export function useComments(cardId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await commentsApi.list(cardId);
      setComments(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  const addComment = useCallback(async (text: string) => {
    if (!cardId) return;
    const comment = await commentsApi.create({ cardId, text });
    setComments((prev) => [...prev, comment]);
    return comment;
  }, [cardId]);

  const removeComment = useCallback(async (id: string) => {
    await commentsApi.delete(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { comments, loading, error, refresh: load, addComment, removeComment };
}
