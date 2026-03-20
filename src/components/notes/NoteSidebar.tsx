import { useState } from 'react';
import { Icon16Add, Icon16Delete } from '@vkontakte/icons';
import type { Note } from '../../types/note';

interface NoteTreeItem extends Note {
  children: NoteTreeItem[];
}

function buildTree(notes: Note[]): NoteTreeItem[] {
  const byId = new Map<string, NoteTreeItem>();
  notes.forEach((n) => byId.set(n.id, { ...n, children: [] }));

  const roots: NoteTreeItem[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortByOrder = (arr: NoteTreeItem[]) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((n) => sortByOrder(n.children));
    return arr;
  };

  return sortByOrder(roots);
}

interface TreeNodeProps {
  node: NoteTreeItem;
  selectedId: string | null;
  canEdit: boolean;
  depth: number;
  onSelect: (note: Note) => void;
  onAdd: (parentId: string) => void;
  onDelete: (noteId: string) => void;
}

function TreeNode({ node, selectedId, canEdit, depth, onSelect, onAdd, onDelete }: TreeNodeProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        className={`note-tree__item${node.id === selectedId ? ' note-tree__item--active' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onSelect(node)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="note-tree__icon">📄</span>
        <span className="note-tree__label">{node.title || 'Без названия'}</span>
        {canEdit && hovered && (
          <div className="note-tree__actions">
            <button
              className="note-tree__btn"
              onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
              title="Добавить подстраницу"
            >
              <Icon16Add />
            </button>
            <button
              className="note-tree__btn note-tree__btn--danger"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              title="Удалить"
            >
              <Icon16Delete />
            </button>
          </div>
        )}
      </div>
      {node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          selectedId={selectedId}
          canEdit={canEdit}
          depth={depth + 1}
          onSelect={onSelect}
          onAdd={onAdd}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface NoteSidebarProps {
  notes: Note[];
  selectedId: string | null;
  canEdit: boolean;
  onSelect: (note: Note) => void;
  onAdd: (parentId?: string) => void;
  onDelete: (noteId: string) => void;
}

export function NoteSidebar({ notes, selectedId, canEdit, onSelect, onAdd, onDelete }: NoteSidebarProps) {
  const tree = buildTree(notes);

  return (
    <div className="note-sidebar">
      <div className="note-sidebar__header">
        <span className="note-sidebar__title">Страницы</span>
        {canEdit && (
          <button className="note-sidebar__add-btn" onClick={() => onAdd()} title="Новая страница">
            <Icon16Add />
          </button>
        )}
      </div>

      <div className="note-sidebar__tree">
        {tree.length === 0 ? (
          <div className="note-sidebar__empty">Нет страниц</div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selectedId={selectedId}
              canEdit={canEdit}
              depth={0}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
