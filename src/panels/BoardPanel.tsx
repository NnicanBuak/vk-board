import { useState, useEffect, useRef, useCallback, useMemo, type JSX, type CSSProperties } from 'react';
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
  ActionSheet,
  ActionSheetItem,
  ModalRoot,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  FormItem,
  Input,
  Textarea,
  Button,
  Alert,
  List,
  CellButton,
} from '@vkontakte/vkui';
import {
  Icon24LinkedOutline,
  Icon28MoreHorizontal,
  Icon16SortArrowUp,
  Icon16SortArrowDown,
  Icon16Like,
  Icon16ClockOutline,
  Icon16Done,
} from '@vkontakte/icons';
import { useRouteNavigator, useParams, useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { useFab } from '../store/fabState';
import { isDraggingRef } from '../store/dragRef';
import { PANELS } from '../router/routes';
import bridge from '@vkontakte/vk-bridge';

import { useBoardDetail } from '../hooks/useBoardDetail';
import { useCards } from '../hooks/useCards';
import { useColumns } from '../hooks/useColumns';
import { useUser } from '../store/userState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { BrainstormBoard } from '../components/board/BrainstormBoard';
import { NotesBoard } from '../components/notes/NotesBoard';
import { CardDetailModal } from '../components/board/CardDetailModal';
import { buildShareLink } from '../utils/buildShareLink';
import { trackBoardVisit } from '../utils/recentBoards';
import { tagsApi } from '../api/tags';
import { boardsApi } from '../api/boards';
import { uploadImage } from '../api/uploads';
import { usePresence } from '../hooks/usePresence';
import type { Card, Tag } from '../types/card';
import { BOARD_TYPE_LABELS, BOARD_TYPE_THEMES } from '../constants/boardTypes';
import type { BoardMemberDto } from '../../shared/types/board';

const AVATAR_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#33b679', '#fb8c00', '#6d4c41'];
function memberColor(userId: number) { return AVATAR_COLORS[userId % AVATAR_COLORS.length]; }

const MODAL_RENAME = 'board_rename';
const MODAL_DESC = 'board_desc';
const MODAL_COVER = 'board_cover';
const MODAL_SORT = 'brainstorm_sort';

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID ?? 0);

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

  const [activeModal, setActiveModal] = useState<string | null>(null);
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

  // Mini-modal state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [boardTags, setBoardTags] = useState<Tag[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMemberDto[]>([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const viewersBtnRef = useRef<HTMLDivElement>(null);
  const actionsSheetToggleRef = useRef<HTMLButtonElement | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  useEffect(() => {
    if (activeModal !== MODAL_RENAME) return;
    const frame = requestAnimationFrame(() => {
      renameInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeModal]);

  useEffect(() => {
    if (activeModal !== MODAL_DESC) return;
    const frame = requestAnimationFrame(() => {
      descTextareaRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeModal]);

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

  // ── Cover upload helpers ──
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { url } = await uploadImage(file);
      setCoverUrl(url);
      setCoverPreview(url);
    } catch (err) {
      setSnackbar((err as Error).message);
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  const handleVKGallery = async () => {
    try {
      const auth = await bridge.send('VKWebAppGetAuthToken', { app_id: VK_APP_ID, scope: 'photos' });
      const res = await bridge.send('VKWebAppCallAPIMethod', {
        method: 'photos.getAll',
        params: { count: 1, access_token: auth.access_token, v: '5.131' },
      });
      const items = (res.response as { items?: { sizes?: { url: string; width: number }[] }[] })?.items ?? [];
      if (!items.length) { setSnackbar('Нет фото в галерее'); return; }
      const sizes = items[0].sizes ?? [];
      const largest = [...sizes].sort((a, b) => b.width - a.width)[0];
      if (largest?.url) { setCoverUrl(largest.url); setCoverPreview(largest.url); }
    } catch {
      setSnackbar('Не удалось открыть галерею VK');
    }
  };

  // ── ActionSheet handlers ──
  const openRename = () => {
    setEditTitle(board?.title ?? '');
    setActiveModal(MODAL_RENAME);
  };

  const openDesc = () => {
    setEditDesc(board?.description ?? '');
    setActiveModal(MODAL_DESC);
  };

  const openCover = () => {
    setCoverUrl(board?.coverImage ?? '');
    setCoverPreview(board?.coverImage ?? '');
    setActiveModal(MODAL_COVER);
  };

  const handleOpenAccessSettings = () => {
    setActiveModal(null);
    navigator.push(`/board/${boardId}/access`);
  };

  const handleAskDelete = () => {
    setActiveModal(null);
    setShowDeleteAlert(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateBoard({ title: editTitle.trim() });
      setActiveModal(null);
    } catch (e) { setSnackbar((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleSaveDesc = async () => {
    setSaving(true);
    try {
      await updateBoard({ description: editDesc.trim() || undefined });
      setActiveModal(null);
    } catch (e) { setSnackbar((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleSaveCover = async () => {
    setSaving(true);
    try {
      await updateBoard({ coverImage: coverUrl || undefined });
      setActiveModal(null);
    } catch (e) { setSnackbar((e as Error).message); }
    finally { setSaving(false); }
  };


  const boardType = board?.boardType ?? 'kanban';
  const boardTypeTheme = BOARD_TYPE_THEMES[boardType] ?? BOARD_TYPE_THEMES.kanban;

  useEffect(() => {
    if (boardType !== 'brainstorm' && activeModal === MODAL_SORT) {
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
      setActiveModal(MODAL_SORT);
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

  const modals: JSX.Element[] = [];

  if (boardType === 'brainstorm') {
    modals.push(
      <ModalPage
        key={MODAL_SORT}
        id={MODAL_SORT}
        dynamicContentHeight
        hideCloseButton
        header={
          <ModalPageHeader after={<PanelHeaderClose onClick={closeModal} />}>
            Сортировка
          </ModalPageHeader>
        }
      >
        <ModalPageContent>
          <List>
            <CellButton
              before={<Icon16Like />}
              after={brainstormSort === 'likes' ? <Icon16Done /> : undefined}
              onClick={() => handleSelectBrainstormSort('likes')}
            >
              По лайкам
            </CellButton>
            <CellButton
              before={<Icon16ClockOutline />}
              after={brainstormSort === 'date' ? <Icon16Done /> : undefined}
              onClick={() => handleSelectBrainstormSort('date')}
            >
              По дате
            </CellButton>
          </List>
        </ModalPageContent>
      </ModalPage>,
    );
  }

  modals.push(
    <ModalPage
      key={MODAL_RENAME}
      id={MODAL_RENAME}
      dynamicContentHeight
      hideCloseButton
      header={
        <ModalPageHeader after={<PanelHeaderClose onClick={closeModal} />}>
          Название доски
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem top="Название *">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={100}
              getRef={renameInputRef}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleSaveTitle} disabled={!editTitle.trim() || saving} loading={saving}>
              Сохранить
            </Button>
          </FormItem>
        </Box>
      </ModalPageContent>
    </ModalPage>,
    <ModalPage
      key={MODAL_DESC}
      id={MODAL_DESC}
      dynamicContentHeight
      hideCloseButton
      header={
        <ModalPageHeader after={<PanelHeaderClose onClick={closeModal} />}>
          Описание доски
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem top="Описание">
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Необязательно"
              maxLength={300}
              rows={4}
              getRef={descTextareaRef}
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleSaveDesc} disabled={saving} loading={saving}>
              Сохранить
            </Button>
          </FormItem>
        </Box>
      </ModalPageContent>
    </ModalPage>,
    <ModalPage
      key={MODAL_COVER}
      id={MODAL_COVER}
      dynamicContentHeight
      hideCloseButton
      header={
        <ModalPageHeader after={<PanelHeaderClose onClick={closeModal} />}>
          Обложка доски
        </ModalPageHeader>
      }
    >
      <ModalPageContent>
        <Box>
          <FormItem>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverFile}
            />
            {coverPreview && (
              <img
                src={coverPreview}
                alt="preview"
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Button
                size="m"
                mode="secondary"
                stretched
                loading={uploadingCover}
                disabled={uploadingCover}
                onClick={() => coverFileRef.current?.click()}
              >
                С устройства
              </Button>
              <Button
                size="m"
                mode="secondary"
                stretched
                onClick={handleVKGallery}
              >
                Из VK Фото
              </Button>
            </div>
            {coverPreview && (
              <Button
                size="m"
                appearance="negative"
                mode="outline"
                stretched
                style={{ marginBottom: 8 }}
                onClick={() => { setCoverUrl(''); setCoverPreview(''); }}
              >
                Убрать обложку
              </Button>
            )}
            <Button size="l" stretched onClick={handleSaveCover} disabled={saving} loading={saving}>
              Сохранить
            </Button>
          </FormItem>
        </Box>
      </ModalPageContent>
    </ModalPage>,
  );

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
        {modals}
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
