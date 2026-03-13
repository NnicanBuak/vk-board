import { useState } from 'react';
import {
  Panel,
  PanelHeader,
  Button,
  FormItem,
  Input,
  Textarea,
  Spinner,
  PullToRefresh,
  Snackbar,
  Box,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
  FixedLayout,
  Tabs,
  TabsItem,
} from '@vkontakte/vkui';
import { Icon28AddOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

import { useBoards } from '../hooks/useBoards';
import { BoardListItem } from '../components/board/BoardListItem';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { getRecentBoardIds } from '../utils/recentBoards';
import type { Board, BoardType } from '../types/board';

const BOARD_TYPES: { value: BoardType; label: string }[] = [
  { value: 'voting',    label: '🗳 Голосование' },
  { value: 'kanban',    label: '📋 Задачи' },
  { value: 'brainstorm',label: '🧠 Штурм' },
  { value: 'retro',     label: '🔄 Ретро' },
];

const MODAL_CREATE = 'create_board';

interface Props {
  id: string;
}

export function HomePanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const { boards, loading, error, refresh, createBoard } = useBoards();

  const [activeTab, setActiveTab] = useState<'recent' | 'mine'>('recent');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [boardType, setBoardType] = useState<BoardType>('voting');
  const [creating, setCreating] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const openCreate = () => {
    setTitle('Новая доска');
    setDescription('');
    setCoverImage('');
    setBoardType('voting');
    setActiveModal(MODAL_CREATE);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard({
        title: title.trim(),
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        boardType,
      });
      setActiveModal(null);
      navigator.push(`/board/${board.id}`);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const openBoard = (boardId: string) => navigator.push(`/board/${boardId}`);

  const myBoards = boards.filter((b) => b.myRole === 'admin');

  const recentIds = getRecentBoardIds();
  const recentBoards = recentIds
    .map((rid) => boards.find((b) => b.id === rid))
    .filter((b): b is Board => b !== undefined);
  const unseenBoards = boards.filter((b) => !recentIds.includes(b.id));
  const allRecentBoards = [...recentBoards, ...unseenBoards];

  const tabBoards = activeTab === 'mine' ? myBoards : allRecentBoards;

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id={MODAL_CREATE}
        hideCloseButton
        header={
          <ModalPageHeader after={<PanelHeaderClose onClick={() => setActiveModal(null)} />}>
            Новая доска идей
          </ModalPageHeader>
        }
      >
        <Box>
          <FormItem top="Название *">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Подарок Пете"
              maxLength={100}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="О чём будем собирать идеи?"
              maxLength={300}
              rows={2}
            />
          </FormItem>
          <FormItem top="Обложка (URL картинки)">
            <Input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {coverImage.trim() && (
              <img
                src={`/api/images?url=${encodeURIComponent(coverImage.trim())}`}
                alt="preview"
                style={{ marginTop: 8, width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </FormItem>
          <FormItem top="Тип доски">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {BOARD_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setBoardType(t.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1.5px solid',
                    borderColor: boardType === t.value ? 'var(--vkui--color_text_accent)' : 'var(--vkui--color_separator_primary)',
                    background: boardType === t.value ? 'var(--vkui--color_text_accent)' : 'transparent',
                    color: boardType === t.value ? '#fff' : 'var(--vkui--color_text_secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={handleCreate}
              disabled={!title.trim() || creating}
              loading={creating}
            >
              Создать доску
            </Button>
          </FormItem>
        </Box>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader style={{ opacity: 0, height: 0, overflow: 'hidden', position: 'absolute' }}>
        Доски идей
      </PanelHeader>

      <PullToRefresh onRefresh={refresh} isFetching={loading}>
        {/* Hero section */}
        <div className="hero-bg" style={{ height: '50vh' }}>
          <div className="hero-orb hero-orb--1" />
          <div className="hero-orb hero-orb--2" />
          <div className="hero-orb hero-orb--3" />
          <div className="hero-orb hero-orb--4" />

          <div
            className="page-inner"
            style={{
              position: 'relative', zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              padding: '48px 24px 36px',
              gap: 12,
            }}
          >
            <h1 style={{
              fontSize: 34,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: -0.5,
              lineHeight: 1.15,
            }}>
              Доски идей
            </h1>
            <p style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.5,
              maxWidth: 280,
            }}>
              Собирайте и голосуйте за идеи вместе
            </p>
            <button
              onClick={openCreate}
              style={{
                marginTop: 8,
                padding: '12px 24px',
                background: '#ffffff',
                color: '#3f8ae0',
                border: 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                fontFamily: 'inherit',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              Создать доску
            </button>
          </div>
        </div>

        {error && <ErrorPlaceholder message={error} onRetry={refresh} />}

        {!error && (
          <div className="page-inner">
            {/* Tabs */}
            <Tabs style={{ paddingTop: 4 }}>
              <TabsItem
                selected={activeTab === 'recent'}
                onClick={() => setActiveTab('recent')}
              >
                Недавние
              </TabsItem>
              <TabsItem
                selected={activeTab === 'mine'}
                onClick={() => setActiveTab('mine')}
              >
                Мои
              </TabsItem>
            </Tabs>

            {/* Board list */}
            {loading && !boards.length ? (
              <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Spinner size="l" />
              </Box>
            ) : tabBoards.length === 0 ? (
              <EmptyState
                header={activeTab === 'mine' ? 'Ещё нет своих досок' : 'Нет недавних досок'}
                text={
                  activeTab === 'mine'
                    ? 'Нажмите «Создать доску», чтобы начать'
                    : 'Откройте доску по ссылке или создайте свою'
                }
                actionLabel="Создать доску"
                onAction={openCreate}
              />
            ) : (
              <div className="board-grid">
                {tabBoards.map((b) => (
                  <BoardListItem key={b.id} board={b} onClick={() => openBoard(b.id)} />
                ))}
              </div>
            )}

            <div style={{ height: 88 }} />
          </div>
        )}
      </PullToRefresh>

      {!error && (
        <FixedLayout vertical="bottom">
          <div className="page-inner">
            <Box style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
              <button className="fab" onClick={openCreate} aria-label="Создать доску идей">
                <Icon28AddOutline />
              </button>
            </Box>
          </div>
        </FixedLayout>
      )}

      {modal}

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
