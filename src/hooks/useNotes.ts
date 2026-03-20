import { useState, useEffect, useCallback, useRef } from 'react';
import { notesApi } from '../api/notes';
import type { Note } from '../types/note';

export function useNotes(boardId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notesApi.list(boardId);
      setNotes(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  const addNote = useCallback(async (data: { title: string; parentId?: string }) => {
    const note = await notesApi.create(boardId, { ...data, content: '' });
    setNotes((prev) => [...prev, note]);
    return note;
  }, [boardId]);

  const updateNote = useCallback(async (noteId: string, data: { title?: string; content?: string }) => {
    const updated = await notesApi.update(noteId, data);
    setNotes((prev) => prev.map((n) => n.id === noteId ? updated : n));
    return updated;
  }, []);

  const removeNote = useCallback(async (noteId: string) => {
    await notesApi.delete(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId && n.parentId !== noteId));
  }, []);

  // Autosave with debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveContent = useCallback((noteId: string, content: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await notesApi.update(noteId, { content });
        setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content } : n));
      } catch { /* silent autosave failure */ }
    }, 1500);
  }, []);

  return { notes, loading, error, refresh: load, addNote, updateNote, removeNote, saveContent };
}
