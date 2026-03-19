import { useState } from 'react';
import { Spinner } from '@vkontakte/vkui';
import { Icon16MenuOutline } from '@vkontakte/icons';
import { useNotes } from '../../hooks/useNotes';
import { NoteSidebar } from './NoteSidebar';
import { NoteEditor } from './NoteEditor';
import type { Note } from '../../types/note';

interface NotesBoardProps {
  boardId: string;
  canEdit: boolean;
  onSnackbar: (msg: string) => void;
}

export function NotesBoard({ boardId, canEdit, onSnackbar }: NotesBoardProps) {
  const { notes, loading, error, addNote, updateNote, removeNote, saveContent } = useNotes(boardId);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleAdd = async (parentId?: string) => {
    try {
      const note = await addNote({ title: 'Без названия', parentId });
      setSelectedNote(note);
    } catch (e) {
      onSnackbar((e as Error).message);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await removeNote(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(notes.find((n) => n.id !== noteId) ?? null);
      }
    } catch (e) {
      onSnackbar((e as Error).message);
    }
  };

  const handleTitleChange = async (title: string) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, title };
    setSelectedNote(updated);
    try {
      await updateNote(selectedNote.id, { title });
    } catch { /* silent */ }
  };

  const handleSaveContent = (content: string) => {
    if (!selectedNote) return;
    saveContent(selectedNote.id, content);
  };

  if (loading) {
    return (
      <div className="notes-board notes-board--loading">
        <Spinner size="l" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="notes-board notes-board--error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`notes-board${sidebarOpen ? '' : ' notes-board--collapsed'}`}>
      {/* Mobile toggle */}
      <button
        className="notes-board__sidebar-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Открыть/закрыть список страниц"
      >
        <Icon16MenuOutline />
      </button>

      {sidebarOpen && (
        <NoteSidebar
          notes={notes}
          selectedId={selectedNote?.id ?? null}
          canEdit={canEdit}
          onSelect={setSelectedNote}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      )}

      <div className="notes-board__main">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            canEdit={canEdit}
            onSave={handleSaveContent}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <div className="notes-board__placeholder">
            {notes.length === 0
              ? canEdit
                ? <button className="notes-board__create-btn" onClick={() => handleAdd()}>Создать первую страницу</button>
                : <p>Страниц пока нет</p>
              : <p>Выберите страницу</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}
