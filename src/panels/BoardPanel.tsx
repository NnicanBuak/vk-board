import { useState, useEffect, useRef } from 'react';
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
  FormItem,
  Input,
  Textarea,
  Button,
  Alert,
} from '@vkontakte/vkui';
import { Icon24LinkedOutline, Icon16PenOutline, Icon24UsersOutline } from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';

import { useBoardDetail } from '../hooks/useBoardDetail';
import { useCards } from '../hooks/useCards';
import { useColumns } from '../hooks/useColumns';
import { useUser } from '../store/UserContext';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { BrainstormBoard } from '../components/board/BrainstormBoard';
import { NotesBoard } from '../components/notes/NotesBoard';
import { CardDetailModal } from '../components/board/CardDetailModal';
import { buildShareLink } from '../utils/buildShareLink';
import { trackBoardVisit } from '../utils/recentBoards';
import { tagsApi } from '../api/tags';
import { boardsApi } from '../api/boards';
import { usePresence } from '../hooks/usePresence';
import type { Card, Tag } from '../types/card';

const AVATAR_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#33b679', '#fb8c00', '#6d4c41'];
function memberColor(userId: number) { return AVATAR_COLORS[userId % AVATAR_COLORS.length]; }

const MODAL_EDIT_BOARD = 'edit_board';

const BOARD_TYPE_LABELS: Record<string, string> = {
  kanban:    'Kanban',
  brainstorm:'Брейншторм',
  notes:     'Заметки',
};

interface Props { id: string }

export function BoardPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const params = useParams<'boardId'>();
  const boardId = params?.boardId ?? '';

  useEffect(() => { if (boardId) trackBoardVisit(boardId); }, [boardId]);

  const { user } = useUser();
  const userId = user?.userId ?? 0;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCover, setEditCover] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [boardTags, setBoardTags] = useState<Tag[]>([]);
  const [boardMembers, setBoardMembers] = useState<{ userId: number; role: string }[]>([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const viewersBtnRef = useRef<HTMLDivElement>(null);

  const { board, loading: boardLoading, error: boardError, refresh: refreshBoard, updateBoard } = useBoardDetail(boardId);
  const { cards, loading: cardsLoading, error: cardsError, refresh: refreshCards, addCard, updateCard, removeCard, toggleLike } = useCards(boardId, 'date');
  const { columns, loading: columnsLoading, refresh: refreshColumns, addColumn, renameColumn } = useColumns(boardId);

  const isAdmin = board?.myRole === 'admin' || board?.myRole === 'owner';
  const canEdit = isAdmin || board?.myRole === 'editor';
  const loading = boardLoading || cardsLoading || columnsLoading;
  const error = boardError ?? cardsError;

  const selfInfo = user ? { firstName: user.firstName, lastName: user.lastName, photo100: user.photo100 ?? '' } : null;
  const viewers = usePresence(boardId, selfInfo);

  // Load tags + members
  useEffect(() => {
    if (!boardId) return;
    tagsApi.list(boardId).then(setBoardTags).catch(() => {});
    boardsApi.members(boardId).then(setBoardMembers).catch(() => {});
  }, [boardId]);

  // Close viewers popup on outside click
  useEffect(() => {
    if (!viewersOpen) return;
    const handler = (e: MouseEvent) => {
      if (viewersBtnRef.current && !viewersBtnRef.current.contains(e.target as Node)) setViewersOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [viewersOpen]);

  // Sync selectedCard with latest card data
  useEffect(() => {
    if (!selectedCard) return;
    const updated = cards.find((c) => c.id === selectedCard.id);
    if (updated) setSelectedCard(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSnackbar('Ссылка скопирована');
  };

  const handleDeleteBoard = async () => {
    try {
      await boardsApi.delete(boardId);
      navigator.back();
    } catch (e) {
      setSnackbar((e as Error).message);
    }
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
      await updateBoard({ title: editTitle.trim(), description: editDesc.trim() || undefined, coverImage: editCover.trim() || undefined });
      setActiveModal(null);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setSavingBoard(false);
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

  const boardType = board?.boardType ?? 'kanban';

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
                    <div key={v.userId} className="member-avatar" style={v.photo100 ? undefined : { background: memberColor(v.userId) }}>
                      {v.photo100 ? <img src={v.photo100} alt="" /> : v.firstName.charAt(0)}
                    </div>
                  ))}
                  {viewers.length > 3 && <div className="member-avatar member-avatar--more">+{viewers.length - 3}</div>}
                </button>

                {viewersOpen && (
                  <div className="viewers-popup">
                    <div className="viewers-popup__title">Сейчас смотрят</div>
                    {viewers.map((v) => (
                      <button key={v.userId} className="viewers-popup__item" onClick={() => window.open(`https://vk.com/id${v.userId}`, '_blank')}>
                        <div className="member-avatar" style={{ flexShrink: 0, ...(v.photo100 ? {} : { background: memberColor(v.userId) }) }}>
                          {v.photo100 ? <img src={v.photo100} alt="" /> : v.firstName.charAt(0)}
                        </div>
                        <span>{v.firstName} {v.lastName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isAdmin && (
              <PanelHeaderButton onClick={() => navigator.push(`/board/${boardId}/access`)} aria-label="Управление доступом">
                <Icon24UsersOutline />
              </PanelHeaderButton>
            )}
            <PanelHeaderButton onClick={handleCopyLink} aria-label="Скопировать ссылку">
              <Icon24LinkedOutline />
            </PanelHeaderButton>
          </div>
        }
      >
        {BOARD_TYPE_LABELS[board?.boardType ?? ''] ?? 'Доска'}
      </PanelHeader>

      <PullToRefresh
        onRefresh={() => { refreshBoard(); refreshCards(); refreshColumns(); }}
        isFetching={loading}
      >
        {error ? (
          <ErrorPlaceholder message={error} onRetry={() => { refreshBoard(); refreshCards(); }} />
        ) : (
          <div className="page-inner">
            {/* Board title */}
            {isAdmin ? (
              <button className="board-page-title board-page-title--editable" onClick={openEditBoard}>
                {board?.title ?? ''}
                <Icon16PenOutline className="board-page-title__icon" />
              </button>
            ) : (
              <h2 className="board-page-title">{board?.title ?? ''}</h2>
            )}
            {board?.description && <p className="board-page-desc">{board.description}</p>}

            {loading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Spinner size="l" />
              </Box>
            ) : boardType === 'kanban' ? (
              <KanbanBoard
                cards={cards}
                columns={columns}
                isAdmin={isAdmin}
                canEdit={canEdit}
                userId={userId}
                addCard={addCard}
                updateCard={async (id, data) => { await updateCard(id, data); }}
                addColumn={addColumn}
                renameColumn={renameColumn}
                toggleLike={toggleLike}
                onCardClick={setSelectedCard}
                onSnackbar={setSnackbar}
              />
            ) : boardType === 'brainstorm' ? (
              <BrainstormBoard
                cards={cards}
                canEdit={canEdit}
                userId={userId}
                addCard={addCard}
                toggleLike={toggleLike}
                onCardClick={setSelectedCard}
                onSnackbar={setSnackbar}
              />
            ) : (
              <NotesBoard
                boardId={boardId}
                canEdit={canEdit}
                onSnackbar={setSnackbar}
              />
            )}
          </div>
        )}
      </PullToRefresh>

      {/* Edit board modal */}
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
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
            <FormItem top="Обложка (URL)">
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
            <FormItem>
              <Button
                size="l"
                stretched
                appearance="negative"
                mode="outline"
                onClick={() => { setActiveModal(null); setShowDeleteAlert(true); }}
              >
                Удалить доску
              </Button>
            </FormItem>
          </Box>
        </ModalPage>
      </ModalRoot>

      {showDeleteAlert && (
        <Alert
          actions={[
            {
              title: 'Удалить',
              mode: 'destructive',
              action: handleDeleteBoard,
            },
            {
              title: 'Отмена',
              mode: 'cancel',
            },
          ]}
          actionsLayout="horizontal"
          onClose={() => setShowDeleteAlert(false)}
          title="Удалить доску?"
          description={`«${board?.title}» и все её данные будут удалены без возможности восстановления.`}
        />
      )}

      {/* Card detail (kanban + brainstorm) */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          columns={columns}
          boardTags={boardTags}
          boardMembers={boardMembers}
          currentUserId={userId}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onClose={() => setSelectedCard(null)}
          onLike={() => toggleLike(selectedCard.id, userId)}
          onMoveColumn={(columnId) => updateCard(selectedCard.id, { columnId })}
          onDelete={() => handleDeleteCard(selectedCard.id)}
          onUpdate={async (data) => { await updateCard(selectedCard.id, data); }}
          onTagAssign={handleTagAssign}
          onTagUnassign={handleTagUnassign}
          onTagCreate={handleTagCreate}
        />
      )}

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
