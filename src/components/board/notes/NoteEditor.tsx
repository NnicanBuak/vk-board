import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import type { Note } from '../../../types/note';

interface ToolbarProps {
  editor: ReturnType<typeof useEditor>;
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const btn = (label: string, action: () => void, active?: boolean, title?: string) => (
    <button
      className={`ne-toolbar__btn${active ? ' ne-toolbar__btn--active' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      title={title ?? label}
    >
      {label}
    </button>
  );

  return (
    <div className="ne-toolbar">
      {btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        editor.isActive('heading', { level: 1 }), 'Заголовок 1')}
      {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        editor.isActive('heading', { level: 2 }), 'Заголовок 2')}
      {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        editor.isActive('heading', { level: 3 }), 'Заголовок 3')}
      <div className="ne-toolbar__sep" />
      {btn('B', () => editor.chain().focus().toggleBold().run(),
        editor.isActive('bold'), 'Жирный')}
      {btn('I', () => editor.chain().focus().toggleItalic().run(),
        editor.isActive('italic'), 'Курсив')}
      {btn('S', () => editor.chain().focus().toggleStrike().run(),
        editor.isActive('strike'), 'Зачёркнутый')}
      <div className="ne-toolbar__sep" />
      {btn('• Список', () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive('bulletList'))}
      {btn('1. Список', () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive('orderedList'))}
      <div className="ne-toolbar__sep" />
      {btn('—', () => editor.chain().focus().setHorizontalRule().run(), false, 'Разделитель')}
    </div>
  );
}

interface NoteEditorProps {
  note: Note;
  canEdit: boolean;
  onSave: (content: string) => void;
  onTitleChange: (title: string) => void;
}

export function NoteEditor({ note, canEdit, onSave, onTitleChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: !canEdit }),
    ],
    content: note.content || '',
    editable: canEdit,
    onUpdate: ({ editor: e }) => {
      onSave(JSON.stringify(e.getJSON()));
    },
  });

  // Re-init content when note changes
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = note.content || '';
    if (current !== incoming) {
      try {
        editor.commands.setContent(incoming ? JSON.parse(incoming) : '');
      } catch {
        editor.commands.setContent(incoming);
      }
    }
    editor.setEditable(canEdit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, canEdit]);

  return (
    <div className="note-editor">
      <div className="note-editor__title-wrap">
        <input
          className="note-editor__title"
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Название страницы"
          readOnly={!canEdit}
        />
      </div>

      {canEdit && <Toolbar editor={editor} />}

      <EditorContent editor={editor} className="note-editor__content" />
    </div>
  );
}
