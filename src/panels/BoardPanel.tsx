import { useState, useEffect, useRef, useCallback, useMemo, type JSX, type CSSProperties } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  PanelHeaderButton,
  Spinner,
  PullToRefresh,
  Snackbar,
  Box,
  ActionSheet,
  ActionSheetItem,
  ModalRoot,
  Alert,
} from '@vkontakte/vkui';
import {
  Icon24LinkedOutline,
  Icon28MoreHorizontal,
  Icon16SortArrowUp,
  Icon16SortArrowDown,
} from '@vkontakte/icons';
import { useRouteNavigator, useParams, useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { useFab } from '../store/fabState';
import { isDraggingRef } from '../store/dragRef';
import { PANELS } from '../router/routes';

import { useBoardDetail } from '../hooks/useBoardDetail';
import { useCards } from '../hooks/useCards';
import { useColumns } from '../hooks/useColumns';
import { useUser } from '../store/userState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { BrainstormBoard } from '../components/board/brainstorm/BrainstormBoard';
import { KanbanBoard } from '../components/board/kanban/KanbanBoard';
import { NotesBoard } from '../components/board/notes/NotesBoard';
import { BoardCoverModal } from '../components/modals/BoardCoverModal';
import { BoardDescriptionModal } from '../components/modals/BoardDescriptionModal';
import { BoardRenameModal } from '../components/modals/BoardRenameModal';
import { BrainstormSortModal } from '../components/modals/BrainstormSortModal';
import { CardDetailModal } from '../components/modals/CardDetailModal';
import { buildShareLink } from '../utils/buildShareLink';
import { trackBoardVisit } from '../utils/recentBoards';
import { tagsApi } from '../api/tags';
import { boardsApi } from '../api/boards';
import { usePresence } from '../hooks/usePresence';
import type { Card, Tag } from '../types/card';
import { BOARD_TYPE_LABELS, BOARD_TYPE_THEMES } from '../constants/boardTypes';
import type { BoardMemberDto } from '../../shared/types/board';

const AVATAR_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#33b679', '#fb8c00', '#6d4c41'];
function memberColor(userId: number) { return AVATAR_COLORS[userId % AVATAR_COLORS.length]; }

const BOARD_MODAL_IDS = {
  rename: 'board_rename',
  description: 'board_desc',
  cover: 'board_cover',
  sort: 'brainstorm_sort',
} as const;

type BoardModalId = (typeof BOARD_MODAL_IDS)[keyof typeof BOARD_MODAL_IDS];

interface Props { id: string }

export function BoardPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const { panel } = useActiveVkuiLocation();
  const { showFab, hideFab } = useFab();
  const params = useParams<'boardId'>();
  const rawBoardId = params?.boardId ?? '';
  const boardIdRef = useRef(rawBoardId);
  if (rawBoardId) boardIdRef.current = rawBoardId;
  const boardId = boardIdRef.current;

  useEffect(() => { if (boardId) trackBoardVisit(boardId); }, [boardId]);

  const { user } = useUser();
  const userId = user?.userId ?? 0;

  const [activeModal, setActiveModal] = useState<BoardModalId | null>(null);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const fabActionRef = useRef<(() => void) | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [brainstormSort, setBrainstormSort] = useState<'likes' | 'date'>('likes');
  const [brainstormDirection, setBrainstormDirection] = useState<'desc' | 'asc'>('desc');
  const sortHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortLongPressTriggered = useRef(false);
  const closeActionsSheet = () => setActionsSheetOpen(false);
  const openActionsSheet = () => setActionsSheetOpen(true);
  const runFromActionsSheet = (callback: () => void) => () => {
    closeActionsSheet();
    callback();
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [boardTags, setBoardTags] = useState<Tag[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMemberDto[]>([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const viewersBtnRef = useRef<HTMLDivElement>(null);
  const actionsSheetToggleRef = useRef<HTMLButtonElement | null>(null);

  const { board, loading: boardLoading, error: boardError, refresh: refreshBoard, updateBoard } = useBoardDetail(boardId);
  const { cards, loading: cardsLoading, error: cardsError, refresh: refreshCards, addCard, updateCard, removeCard, toggleLike } = useCards(boardId, 'date');
  const { columns, loading: columnsLoading, refresh: refreshColumns, addColumn, renameColumn } = useColumns(boardId);

  const isOwner = board?.myRole === 'owner';
  const isAdmin = board?.myRole === 'admin';
  const isBoardManager = isOwner || isAdmin;
  const canManageBoardActions = isBoardManager;
  const canEdit = isBoardManager || board?.myRole === 'editor';
  const canManageBoardSettings = isOwner;
  const loading = boardLoading || cardsLoading || columnsLoading;
  const error = boardError ?? cardsError;

  const selfInfo = useMemo(
    () => (user ? { firstName: user.firstName, lastName: user.lastName, photo100: user.photo100 ?? '' } : null),
    [user],
  );
  const viewers = usePresence(boardId, selfInfo);

  // Load tags + members
  useEffect(() => {
    if (!boardId) return;
    tagsApi.list(boardId).then(setBoardTags).catch(() => { });
    boardsApi.members(boardId).then(setBoardMembers).catch(() => { });
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
    } catch { /* silent — clipboard API unavailable */ }
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
      const colors = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#33b679', '#fb8c00'];
      const color = colors[name.length % colors.length];
      const tag = await tagsApi.create({ boardId, name, color });
      setBoardTags((prev) => [...prev, tag]);
      await tagsApi.assign(selectedCard.id, tag.id);
    }
    refreshCards();
  };

  // ── ActionSheet handlers ──
  const openRename = () => setActiveModal(BOARD_MODAL_IDS.rename);

  const openDesc = () => setActiveModal(BOARD_MODAL_IDS.description);

  const openCover = () => setActiveModal(BOARD_MODAL_IDS.cover);

  const handleOpenAccessSettings = () => {
    setActiveModal(null);
    navigator.push(`/board/${boardId}/access`);
  };

  const handleAskDelete = () => {
    setActiveModal(null);
    setShowDeleteAlert(true);
  };

  const handleSaveTitle = async (title: string) => {
    await updateBoard({ title });
  };

  const handleSaveDesc = async (description?: string) => {
    await updateBoard({ description });
  };

  const handleSaveCover = async (coverImage?: string) => {
    await updateBoard({ coverImage });
  };


  const boardType = board?.boardType ?? 'kanban';
  const boardTypeTheme = BOARD_TYPE_THEMES[boardType] ?? BOARD_TYPE_THEMES.kanban;

  useEffect(() => {
    if (boardType !== 'brainstorm' && activeModal === BOARD_MODAL_IDS.sort) {
      setActiveModal(null);
    }
  }, [boardType, activeModal]);

  useEffect(() => {
    if (!canManageBoardActions && actionsSheetOpen) {
      setActionsSheetOpen(false);
    }
  }, [canManageBoardActions, actionsSheetOpen]);

  useEffect(() => {
    return () => {
      if (sortHoldTimer.current) {
        clearTimeout(sortHoldTimer.current);
        sortHoldTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setBrainstormSort('likes');
    setBrainstormDirection('desc');
  }, [boardId]);

  const cancelBrainstormSortTimer = () => {
    if (sortHoldTimer.current !== null) {
      clearTimeout(sortHoldTimer.current);
      sortHoldTimer.current = null;
      return true;
    }
    return false;
  };

  const handleBrainstormSortPointerDown = () => {
    sortLongPressTriggered.current = false;
    sortHoldTimer.current = setTimeout(() => {
      sortHoldTimer.current = null;
      sortLongPressTriggered.current = true;
      setActiveModal(BOARD_MODAL_IDS.sort);
    }, 400);
  };

  const handleBrainstormSortPointerUp = () => {
    if (cancelBrainstormSortTimer() && !sortLongPressTriggered.current) {
      setBrainstormDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
    }
  };

  const handleBrainstormSortPointerLeave = () => {
    cancelBrainstormSortTimer();
  };

  const handleSelectBrainstormSort = (mode: 'likes' | 'date') => {
    setBrainstormSort(mode);
    setActiveModal(null);
  };

  useEffect(() => {
    const active = panel === PANELS.BOARD && canEdit && boardType !== 'notes';
    if (!active || actionsSheetOpen) {
      hideFab();
      return;
    }
    showFab(() => fabActionRef.current?.());
  }, [panel, canEdit, boardType, actionsSheetOpen, showFab, hideFab]);

  const registerFabAction = useCallback((handler: (() => void) | null) => {
    fabActionRef.current = handler;
  }, []);

  const closeModal = () => setActiveModal(null);
  const boardModals: JSX.Element[] = [
    <BoardRenameModal
      key={BOARD_MODAL_IDS.rename}
      id={BOARD_MODAL_IDS.rename}
      open={activeModal === BOARD_MODAL_IDS.rename}
      initialTitle={board?.title ?? ''}
      onClose={closeModal}
      onSave={handleSaveTitle}
      onError={setSnackbar}
    />,
    <BoardDescriptionModal
      key={BOARD_MODAL_IDS.description}
      id={BOARD_MODAL_IDS.description}
      open={activeModal === BOARD_MODAL_IDS.description}
      initialDescription={board?.description ?? ''}
      onClose={closeModal}
      onSave={handleSaveDesc}
      onError={setSnackbar}
    />,
    <BoardCoverModal
      key={BOARD_MODAL_IDS.cover}
      id={BOARD_MODAL_IDS.cover}
      open={activeModal === BOARD_MODAL_IDS.cover}
      initialCoverImage={board?.coverImage ?? undefined}
      onClose={closeModal}
      onSave={handleSaveCover}
      onError={setSnackbar}
    />,
  ];

  if (boardType === 'brainstorm') {
    boardModals.unshift(
      <BrainstormSortModal
        key={BOARD_MODAL_IDS.sort}
        id={BOARD_MODAL_IDS.sort}
        sortMode={brainstormSort}
        onClose={closeModal}
        onSelect={handleSelectBrainstormSort}
      />,
    );
  }

  return (
    <Panel id={id} className="board-panel">
      <PanelHeader
        className="board-panel-header"
        before={<PanelHeaderBack onClick={() => navigator.back()} />}
      >
        <div className="board-panel-header__inner">
          <span
            className="board-panel-header__chip"
            style={{
              '--board-panel-chip-bg': boardTypeTheme.bg,
              '--board-panel-chip-color': boardTypeTheme.text,
            } as CSSProperties}
          >
            {BOARD_TYPE_LABELS[boardType] ?? 'Доска'}
          </span>
          <div className="board-panel-header__actions">
            {viewers.length > 0 && (
              <div className="board-panel-header__viewers" ref={viewersBtnRef}>
                <button
                  className="member-avatars"
                  type="button"
                  onClick={() => setViewersOpen((v) => !v)}
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
            <PanelHeaderButton onClick={handleCopyLink} aria-label="Скопировать ссылку">
              <Icon24LinkedOutline />
            </PanelHeaderButton>
            {canManageBoardActions && (
              <PanelHeaderButton
                onClick={openActionsSheet}
                aria-label="Действия с доской"
                getRootRef={actionsSheetToggleRef}
              >
                <Icon28MoreHorizontal />
              </PanelHeaderButton>
            )}
          </div>
        </div>
      </PanelHeader>

      <PullToRefresh
        onRefresh={() => { if (!isDraggingRef.current) { refreshBoard(); refreshCards(); refreshColumns(); } }}
        isFetching={loading}
      >
        {error ? (
          <ErrorPlaceholder message={error} onRetry={() => { refreshBoard(); refreshCards(); }} />
        ) : (
          <div className="board-panel__body">
            <div className="page-inner">
            {/* Board title + description */}
            <div className="board-page-title-row">
              <h2 className="board-page-title">{board?.title ?? ''}</h2>
              {boardType === 'brainstorm' && (
                <div className="brainstorm__header brainstorm__header--inline">
                  <button
                    className="brainstorm__sort-btn"
                    onPointerDown={handleBrainstormSortPointerDown}
                    onPointerUp={handleBrainstormSortPointerUp}
                    onPointerLeave={handleBrainstormSortPointerLeave}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label="Сортировка карточек"
                  >
                    {brainstormDirection === 'desc' ? <Icon16SortArrowDown /> : <Icon16SortArrowUp />}
                    {brainstormSort === 'likes' ? 'По лайкам' : 'По дате'}
                  </button>
                </div>
              )}
            </div>
            {board?.description && <p className="board-page-desc">{board.description}</p>}

            {loading ? (
              <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Spinner size="l" />
              </Box>
            ) : boardType === 'kanban' ? (
              <KanbanBoard
                cards={cards}
                columns={columns}
                isAdmin={isBoardManager}
                canEdit={canEdit}
                userId={userId}
                addCard={addCard}
                updateCard={async (id, data) => { await updateCard(id, data); }}
                addColumn={addColumn}
                renameColumn={renameColumn}
                toggleLike={toggleLike}
                onCardClick={setSelectedCard}
                onSnackbar={setSnackbar}
                onDraggingChange={(v) => { isDraggingRef.current = v; }}
                registerFabAction={registerFabAction}
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
                registerFabAction={registerFabAction}
                sortMode={brainstormSort}
                sortDirection={brainstormDirection}
              />
            ) : (
              <NotesBoard
                boardId={boardId}
                canEdit={canEdit}
                onSnackbar={setSnackbar}
              />
            )}
            </div>
          </div>
        )}
      </PullToRefresh>

      {canManageBoardActions && actionsSheetOpen && (
        <ActionSheet
          className="board-actions-sheet"
          iosCloseItem={null}
          onClose={closeActionsSheet}
          toggleRef={actionsSheetToggleRef}
        >
          <ActionSheetItem onClick={runFromActionsSheet(openRename)}>
            Переименовать
          </ActionSheetItem>
          <ActionSheetItem onClick={runFromActionsSheet(openDesc)}>
            Изменить описание
          </ActionSheetItem>
          <ActionSheetItem onClick={runFromActionsSheet(openCover)}>
            Изменить обложку
          </ActionSheetItem>
          <ActionSheetItem onClick={runFromActionsSheet(handleOpenAccessSettings)}>
            Настройки доступа
          </ActionSheetItem>
          {canManageBoardSettings && (
            <ActionSheetItem mode="destructive" onClick={runFromActionsSheet(handleAskDelete)}>
              Удалить доску
            </ActionSheetItem>
          )}
        </ActionSheet>
      )}

      {/* Mini modals */}
      <ModalRoot activeModal={activeModal} onClose={closeModal}>
        {boardModals}
      </ModalRoot>

      {showDeleteAlert && (
        <Alert
          actions={[
            { title: 'Удалить', mode: 'destructive', action: handleDeleteBoard },
            { title: 'Отмена', mode: 'cancel' },
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
            isAdmin={isBoardManager}
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
