import { useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Icon16Add } from '@vkontakte/icons';
import type { Card, Column } from '../../../types/card';
import { KanbanCard } from './KanbanCard';

interface Props {
  column: Column;
  cards: Card[];
  currentUserId: number;
  isAdmin: boolean;
  onCardClick: (card: Card) => void;
  onCardLike: (cardId: string) => void;
  onAddCard: (columnId: string) => void;
  onRename?: (id: string, title: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  currentUserId,
  isAdmin,
  onCardClick,
  onCardLike,
  onAddCard,
  onRename,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const commitRename = () => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== column.title) {
      onRename?.(column.id, trimmed);
    } else {
      setTitleValue(column.title);
    }
  };

  return (
    <div className="kcolumn">
      <div className="kcolumn__header">
        {editingTitle && isAdmin ? (
          <input
            ref={inputRef}
            className="kcolumn__title-input"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
              if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(column.title); }
            }}
            autoFocus
          />
        ) : (
          <span
            className="kcolumn__title"
            onClick={() => isAdmin && setEditingTitle(true)}
            title={isAdmin ? 'Нажмите, чтобы переименовать' : undefined}
          >
            {column.title}
          </span>
        )}
        <span className="kcolumn__count">{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`kcolumn__cards${isOver ? ' kcolumn__cards--over' : ''}`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              currentUserId={currentUserId}
              onClick={() => onCardClick(card)}
              onLike={() => onCardLike(card.id)}
            />
          ))}
        </SortableContext>
      </div>

      <button
        className="kcolumn__add-btn"
        onClick={() => onAddCard(column.id)}
        aria-label="Добавить карточку"
      >
        <Icon16Add />
        <span>Добавить</span>
      </button>
    </div>
  );
}
