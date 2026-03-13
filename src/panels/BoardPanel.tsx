import { useState, useEffect, useRef } from 'react';
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
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  PanelHeaderButton,
  PanelHeaderClose,
  Spinner,
  PullToRefresh,
  Snackbar,
  Box,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FixedLayout,
  Button,
  FormItem,
  Input,
  Textarea,
} from '@vkontakte/vkui';
import {
  Icon24LinkedOutline,
  Icon28AddOutline,
  Icon16PenOutline,
  Icon16Add,
} from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';

import { useBoardDetail } from '../hooks/useBoardDetail';
import { useCards } from '../hooks/useCards';
import { useColumns } from '../hooks/useColumns';
import { useUser } from '../store/UserContext';
import { CardForm } from '../components/card/CardForm';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { KanbanColumn } from '../components/board/KanbanColumn';
import { KanbanCard } from '../components/board/KanbanCard';
import { CardDetailModal } from '../components/board/CardDetailModal';
import { buildShareLink } from '../utils/buildShareLink';
import { trackBoardVisit } from '../utils/recentBoards';
import { tagsApi } from '../api/tags';
import { usePresence } from '../hooks/usePresence';
import type { Card, Tag } from '../types/card';

const AVATAR_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#33b679', '#fb8c00', '#6d4c41'];
function memberColor(userId: number) { return AVATAR_COLORS[userId % AVATAR_COLORS.length]; }

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

const MODAL_CARD = 'card_form';
const MODAL_EDIT_BOARD = 'edit_board';
const MODAL_ADD_COLUMN = 'add_column';

interface Props {
  id: string;
}

export function BoardPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const params = useParams<'boardId'>();
  const boardId = params?.boardId ?? '';

  useEffect(() => { if (boardId) trackBoardVisit(boardId); }, [boardId]);

  const { user } = useUser();
  const userId = user?.userId ?? 0;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [addCardColumnId, setAddCardColumnId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCover, setEditCover] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [boardTags, setBoardTags] = useState<Tag[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const [viewersOpen, setViewersOpen] = useState(false);
  const viewersBtnRef = useRef<HTMLDivElement>(null);

  const { board, loading: boardLoading, error: boardError, refresh: refreshBoard, updateBoard } = useBoardDetail(boardId);
  const { cards, loading: cardsLoading, error: cardsError, refresh: refreshCards, addCard, updateCard, removeCard, toggleLike } = useCards(boardId, 'date');
  const { columns, loading: columnsLoading, refresh: refreshColumns, addColumn, renameColumn } = useColumns(boardId);

  const isAdmin = board?.myRole === 'admin';
  const loading = boardLoading || cardsLoading || columnsLoading;
  const error = boardError ?? cardsError;

  // Presence tracking
  const selfInfo = user ? { firstName: user.firstName, lastName: user.lastName, photo100: user.photo100 ?? '' } : null;
  const viewers = usePresence(boardId, selfInfo);

  // Load board tags
  useEffect(() => {
    if (!boardId) return;
    tagsApi.list(boardId).then(setBoardTags).catch(() => {});
  }, [boardId]);

  // Close viewers popup on outside click
  useEffect(() => {
    if (!viewersOpen) return;
    const handler = (e: MouseEvent) => {
      if (viewersBtnRef.current && !viewersBtnRef.current.contains(e.target as Node)) {
        setViewersOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [viewersOpen]);

  // Keep selectedCard in sync with card list updates
  useEffect(() => {
    if (!selectedCard) return;
    const updated = cards.find((c) => c.id === selectedCard.id);
    if (updated) setSelectedCard(updated);
  }, [cards]);

  const handleCopyLink = async () => {
    const link = buildShareLink(boardId);
    try {
      await window.navigator.clipboard.writeText(link);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* silent */ }
    }
    setSnackbar('Ссылка на доску скопирована');
  };

  const openEditBoard = () => {
    setEditTitle(board?.title ?? '');
    setEditDesc(board?.description ?? '');
    setEditCover(board?.coverImage ?? '');
    setActiveModal(MODAL_EDIT_BOARD);
  };

  const handleSaveBoard = async () => {
    if (!editTitle.trim()) return;
    setSavingBoard(true);
    try {
      await updateBoard({
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        coverImage: editCover.trim() || undefined,
      });
      setActiveModal(null);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setSavingBoard(false);
    }
  };

  const openAddCard = (columnId: string | null = null) => {
    setEditingCard(null);
    setAddCardColumnId(columnId);
    setActiveModal(MODAL_CARD);
  };

  const handleCardSave = async (data: { title: string; description?: string; url?: string }) => {
    try {
      if (editingCard) {
        await updateCard(editingCard.id, data);
      } else {
        await addCard({ ...data, columnId: addCardColumnId });
      }
      setActiveModal(null);
      setEditingCard(null);
    } catch (e) {
      setSnackbar((e as Error).message);
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
      setSnackbar((e as Error).message);
    }
  };

  const handleMoveCard = async (cardId: string, columnId: string | null) => {
    try {
      await updateCard(cardId, { columnId });
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await removeCard(cardId);
      setSelectedCard(null);
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const handleTagAssign = async (tagId: string) => {
    if (!selectedCard) return;
    await tagsApi.assign(selectedCard.id, tagId);
    refreshCards();
  };

  const handleTagUnassign = async (tagId: string) => {
    if (!selectedCard) return;
    await tagsApi.unassign(selectedCard.id, tagId);
    refreshCards();
  };

  const handleTagCreate = async (name: string) => {
    if (!selectedCard) return;
    const existing = boardTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await tagsApi.assign(selectedCard.id, existing.id);
    } else {
      const colors = ['#e53935','#8e24aa','#1e88e5','#00897b','#f4511e','#33b679','#fb8c00'];
      const color = colors[name.length % colors.length];
      const tag = await tagsApi.create({ boardId, name, color });
      setBoardTags((prev) => [...prev, tag]);
      await tagsApi.assign(selectedCard.id, tag.id);
    }
    refreshCards();
  };

  // Cards without a column (backlog)
  const uncolumnedCards = cards.filter((c) => !c.columnId);
  const cardsForColumn = (colId: string) => cards.filter((c) => c.columnId === colId);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveCard(cards.find((c) => c.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
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
      handleMoveCard(String(active.id), newColumnId);
    }
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => { setActiveModal(null); setEditingCard(null); }}>
      <ModalPage
        id={MODAL_CARD}
        hideCloseButton
        header={
          <ModalPageHeader>
            {editingCard ? 'Редактировать идею' : 'Предложить идею'}
          </ModalPageHeader>
        }
      >
        <CardForm
          initial={editingCard ?? undefined}
          onSave={handleCardSave}
          onCancel={() => { setActiveModal(null); setEditingCard(null); }}
        />
      </ModalPage>

      <ModalPage
        id={MODAL_EDIT_BOARD}
        hideCloseButton
        header={
          <ModalPageHeader after={<PanelHeaderClose onClick={() => setActiveModal(null)} />}>
            Редактировать доску
          </ModalPageHeader>
        }
      >
        <Box>
          <FormItem top="Название *">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={100} />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Необязательно"
              maxLength={300}
              rows={3}
            />
          </FormItem>
          <FormItem top="Обложка (URL картинки)">
            <Input
              value={editCover}
              onChange={(e) => setEditCover(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {editCover.trim() && (
              <img
                src={`/api/images?url=${encodeURIComponent(editCover.trim())}`}
                alt="preview"
                style={{ marginTop: 8, width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleSaveBoard} disabled={!editTitle.trim() || savingBoard} loading={savingBoard}>
              Сохранить
            </Button>
          </FormItem>
        </Box>
      </ModalPage>

      <ModalPage
        id={MODAL_ADD_COLUMN}
        hideCloseButton
        header={
          <ModalPageHeader after={<PanelHeaderClose onClick={() => setActiveModal(null)} />}>
            Новая колонка
          </ModalPageHeader>
        }
      >
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
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => navigator.back()} />}
        after={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4 }}>
            {viewers.length > 0 && (
              <div ref={viewersBtnRef} style={{ position: 'relative' }}>
                <button
                  className="member-avatars"
                  onClick={() => setViewersOpen((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  aria-label="Кто смотрит"
                >
                  {viewers.slice(0, 3).map((v) => (
                    <div
                      key={v.userId}
                      className="member-avatar"
                      style={v.photo100 ? undefined : { background: memberColor(v.userId) }}
                    >
                      {v.photo100 ? <img src={v.photo100} alt="" /> : v.firstName.charAt(0)}
                    </div>
                  ))}
                  {viewers.length > 3 && (
                    <div className="member-avatar member-avatar--more">+{viewers.length - 3}</div>
                  )}
                </button>

                {viewersOpen && (
                  <div className="viewers-popup">
                    <div className="viewers-popup__title">Сейчас смотрят</div>
                    {viewers.map((v) => (
                      <button
                        key={v.userId}
                        className="viewers-popup__item"
                        onClick={() => window.open(`https://vk.com/id${v.userId}`, '_blank')}
                      >
                        <div
                          className="member-avatar"
                          style={{ flexShrink: 0, ...(v.photo100 ? {} : { background: memberColor(v.userId) }) }}
                        >
                          {v.photo100 ? <img src={v.photo100} alt="" /> : v.firstName.charAt(0)}
                        </div>
                        <span>{v.firstName} {v.lastName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <PanelHeaderButton onClick={handleCopyLink} aria-label="Скопировать ссылку">
              <Icon24LinkedOutline />
            </PanelHeaderButton>
          </div>
        }
      >
        Доска
      </PanelHeader>

      <PullToRefresh
        onRefresh={() => { refreshBoard(); refreshCards(); refreshColumns(); }}
        isFetching={loading}
      >
        {error ? (
          <ErrorPlaceholder message={error} onRetry={() => { refreshBoard(); refreshCards(); }} />
        ) : (
          <div className="page-inner">
            {/* Second-level title */}
            {isAdmin ? (
              <button className="board-page-title board-page-title--editable" onClick={openEditBoard}>
                {board?.title ?? 'Голосование'}
                <Icon16PenOutline className="board-page-title__icon" />
              </button>
            ) : (
              <h2 className="board-page-title">{board?.title ?? 'Голосование'}</h2>
            )}

            {board?.description && (
              <p className="board-page-desc">{board.description}</p>
            )}

            {/* Kanban board */}
            {loading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Spinner size="l" />
              </Box>
            ) : (
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
                      onCardClick={setSelectedCard}
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
                      onCardClick={setSelectedCard}
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
            )}

            <div style={{ height: 88 }} />
          </div>
        )}
      </PullToRefresh>

      {/* FAB — add card without column */}
      {!error && (
        <FixedLayout vertical="bottom">
          <div className="page-inner">
            <Box style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
              <button className="fab" onClick={() => openAddCard(null)} aria-label="Предложить идею">
                <Icon28AddOutline />
              </button>
            </Box>
          </div>
        </FixedLayout>
      )}

      {modal}

      {/* Full-screen card detail */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          columns={columns}
          boardTags={boardTags}
          currentUserId={userId}
          isAdmin={isAdmin}
          onClose={() => setSelectedCard(null)}
          onLike={() => toggleLike(selectedCard.id, userId)}
          onMoveColumn={(columnId) => handleMoveCard(selectedCard.id, columnId)}
          onDelete={() => handleDeleteCard(selectedCard.id)}
          onUpdate={async (data) => {
            await updateCard(selectedCard.id, data);
          }}
          onTagAssign={handleTagAssign}
          onTagUnassign={handleTagUnassign}
          onTagCreate={handleTagCreate}
        />
      )}

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
