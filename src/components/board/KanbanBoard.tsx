import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, ModalRoot, ModalPage, ModalPageContent, ModalPageHeader, PanelHeaderClose, FormItem, Input, Button } from '@vkontakte/vkui';
import { Icon16Add } from '@vkontakte/icons';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CardForm } from '../card/CardForm';
import type { Card, Column } from '../../types/card';

interface BacklogProps {
  cards: Card[];
  currentUserId: number;
  onCardClick: (card: Card) => void;
  onCardLike: (cardId: string) => void;
  onAddCard: () => void;
}

function BacklogColumn({ cards, currentUserId, onCardClick, onCardLike, onAddCard }: BacklogProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog' });
  return (
    <div className="kcolumn">
      <div className="kcolumn__header">
        <span className="kcolumn__title">Входящие</span>
        <span className="kcolumn__count">{cards.length}</span>
      </div>
      <div ref={setNodeRef} className={`kcolumn__cards${isOver ? ' kcolumn__cards--over' : ''}`}>
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
      <button className="kcolumn__add-btn" onClick={onAddCard}>
        <Icon16Add /><span>Добавить</span>
      </button>
    </div>
  );
}

const MODAL_CARD = 'kb_card_form';
const MODAL_ADD_COLUMN = 'kb_add_column';

interface KanbanBoardProps {
  cards: Card[];
  columns: Column[];
  isAdmin: boolean;
  canEdit: boolean;
  userId: number;
  addCard: (data: { title: string; description?: string; url?: string; columnId: string | null }) => Promise<Card>;
  updateCard: (id: string, data: { columnId?: string | null; title?: string; description?: string; assignees?: number[]; dueDate?: string | null }) => Promise<void>;
  addColumn: (title: string) => Promise<Column>;
  renameColumn: (id: string, title: string) => Promise<void>;
  toggleLike: (cardId: string, userId: number) => void;
  onCardClick: (card: Card) => void;
  onSnackbar: (msg: string) => void;
  onDraggingChange?: (v: boolean) => void;
  registerFabAction?: (handler: (() => void) | null) => void;
}

export function KanbanBoard({
  cards, columns, isAdmin, canEdit, userId,
  addCard, updateCard, addColumn, renameColumn, toggleLike,
  onCardClick, onSnackbar, onDraggingChange, registerFabAction,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [addCardColumnId, setAddCardColumnId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const uncolumnedCards = cards.filter((c) => !c.columnId);
  const cardsForColumn = (colId: string) => cards.filter((c) => c.columnId === colId);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveCard(cards.find((c) => c.id === active.id) ?? null);
    onDraggingChange?.(true);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
    onDraggingChange?.(false);
    if (!over || active.id === over.id) return;
    const dragged = cards.find((c) => c.id === active.id);
    if (!dragged) return;
    const overCard = cards.find((c) => c.id === over.id);
    const overColumn = columns.find((c) => c.id === over.id);
    let newColumnId: string | null = dragged.columnId ?? null;
    if (over.id === 'backlog') newColumnId = null;
    else if (overColumn) newColumnId = overColumn.id;
    else if (overCard) newColumnId = overCard.columnId ?? null;
    if (newColumnId !== (dragged.columnId ?? null)) {
      updateCard(String(active.id), { columnId: newColumnId }).catch((e) => onSnackbar((e as Error).message));
    }
  };

  const openAddCard = useCallback((columnId: string | null = null) => {
    setAddCardColumnId(columnId);
    setActiveModal(MODAL_CARD);
  }, []);



  useEffect(() => {
    if (!canEdit || !registerFabAction) return undefined;
    registerFabAction(() => openAddCard(null));
    return () => registerFabAction(null);
  }, [canEdit, registerFabAction, openAddCard]);
  const handleCardSave = async (data: { title: string; description?: string; url?: string }) => {
    try {
      await addCard({ ...data, columnId: addCardColumnId });
      setActiveModal(null);
    } catch (e) {
      onSnackbar((e as Error).message);
    }
  };

  const handleAddColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      await addColumn(title);
      setNewColumnTitle('');
      setActiveModal(null);
    } catch (e) {
      onSnackbar((e as Error).message);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban">
          {(uncolumnedCards.length > 0 || columns.length === 0) && (
            <BacklogColumn
              cards={uncolumnedCards}
              currentUserId={userId}
              onCardClick={onCardClick}
              onCardLike={(cardId) => toggleLike(cardId, userId)}
              onAddCard={() => openAddCard(null)}
            />
          )}

          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cardsForColumn(col.id)}
              currentUserId={userId}
              isAdmin={isAdmin}
              onCardClick={onCardClick}
              onCardLike={(cardId) => toggleLike(cardId, userId)}
              onAddCard={openAddCard}
              onRename={isAdmin ? renameColumn : undefined}
            />
          ))}

          {isAdmin && (
            <div className="kcolumn kcolumn--ghost">
              <button
                className="kcolumn__new-btn"
                onClick={() => { setNewColumnTitle(''); setActiveModal(MODAL_ADD_COLUMN); }}
              >
                <Icon16Add />
                <span>Новая колонка</span>
              </button>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeCard && (
            <KanbanCard
              card={activeCard}
              currentUserId={userId}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>


      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id={MODAL_CARD}
          dynamicContentHeight
          hideCloseButton
          header={<ModalPageHeader>Новая карточка</ModalPageHeader>}
        >
          <ModalPageContent>
            <CardForm
              onSave={handleCardSave}
              onCancel={() => setActiveModal(null)}
            />
          </ModalPageContent>
        </ModalPage>

        <ModalPage
          id={MODAL_ADD_COLUMN}
          dynamicContentHeight
          hideCloseButton
          header={
            <ModalPageHeader after={<PanelHeaderClose onClick={() => setActiveModal(null)} />}>
              Новая колонка
            </ModalPageHeader>
          }
        >
          <ModalPageContent>
            <Box>
              <FormItem top="Название колонки">
                <Input
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Например: В работе"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                  autoFocus
                />
              </FormItem>
              <FormItem>
                <Button size="l" stretched onClick={handleAddColumn} disabled={!newColumnTitle.trim()}>
                  Создать
                </Button>
              </FormItem>
            </Box>
          </ModalPageContent>
        </ModalPage>
      </ModalRoot>
    </>
  );
}
