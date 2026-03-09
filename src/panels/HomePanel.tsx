import { useState } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Header,
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
  SimpleCell,
  Caption,
} from '@vkontakte/vkui';
import { Icon28AddOutline, Icon24ChevronDown, Icon24ChevronUp } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

import { useBoards } from '../hooks/useBoards';
import { BoardListItem } from '../components/board/BoardListItem';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { getRecentBoardIds } from '../utils/recentBoards';
import type { Board } from '../types/board';

const MODAL_CREATE = 'create_board';
const COLLAPSED_LIMIT = 3;

interface BoardSectionProps {
  title: string;
  boards: Board[];
  onOpen: (id: string) => void;
}

function BoardSection({ title, boards, onOpen }: BoardSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = boards.length > COLLAPSED_LIMIT;
  const visible = expanded ? boards : boards.slice(0, COLLAPSED_LIMIT);

  if (boards.length === 0) return null;

  return (
    <Group header={<Header>{title}</Header>}>
      {visible.map((b) => (
        <BoardListItem key={b.id} board={b} onClick={() => onOpen(b.id)} />
      ))}
      {hasMore && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            background: 'var(--vkui--color_background_content)',
            borderTop: '1px solid var(--vkui--color_separator_primary)',
          }}
        >
          <SimpleCell
            after={expanded ? <Icon24ChevronUp /> : <Icon24ChevronDown />}
            style={{ color: 'var(--vkui--color_text_accent)' }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Скрыть' : `Показать все · ${boards.length}`}
          </SimpleCell>
        </div>
      )}
    </Group>
  );
}

interface Props {
  id: string;
}

export function HomePanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const { boards, loading, error, refresh, createBoard } = useBoards();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const openCreate = () => {
    setTitle('');
    setDescription('');
    setActiveModal(MODAL_CREATE);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard({ title: title.trim(), description: description.trim() || undefined });
      setActiveModal(null);
      navigator.push(`/board/${board.id}`);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const openBoard = (boardId: string) => navigator.push(`/board/${boardId}`);

  // Мои доски — те где я создатель (admin)
  const myBoards = boards.filter((b) => b.myRole === 'admin');

  // Последние просмотренные — доски где я участник, отсортированные по последнему визиту
  const recentIds = getRecentBoardIds();
  const memberBoards = boards.filter((b) => b.myRole !== 'admin');
  const recentBoards = recentIds
    .map((id) => memberBoards.find((b) => b.id === id))
    .filter((b): b is Board => b !== undefined);
  // Добавляем участнические доски которые не попали в recent (новые)
  const unseenMemberBoards = memberBoards.filter((b) => !recentIds.includes(b.id));
  const allRecentBoards = [...recentBoards, ...unseenMemberBoards];

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id={MODAL_CREATE}
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
      <PanelHeader>Доски идей</PanelHeader>

      <PullToRefresh onRefresh={refresh} isFetching={loading}>
        {error && <ErrorPlaceholder message={error} onRetry={refresh} />}

        {!error && (
          <>
            {loading && !boards.length ? (
              <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                <Spinner size="l" />
              </Box>
            ) : boards.length === 0 ? (
              <EmptyState
                header="Ещё нет досок идей"
                text="Создайте доску, поделитесь в чате — и начните собирать идеи вместе"
                actionLabel="Создать доску"
                onAction={openCreate}
              />
            ) : (
              <>
                {/* TODO: Новые идеи (непросмотренные) — требует backend feed-эндпоинта */}

                <BoardSection
                  title="Мои доски"
                  boards={myBoards}
                  onOpen={openBoard}
                />

                {allRecentBoards.length > 0 && (
                  <BoardSection
                    title="Последние просмотренные"
                    boards={allRecentBoards}
                    onOpen={openBoard}
                  />
                )}

                {/* Если пользователь только участник и нет admin-досок */}
                {myBoards.length === 0 && allRecentBoards.length === 0 && (
                  <Box style={{ padding: '8px 16px' }}>
                    <Caption style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      Вы ещё не создавали доски. Нажмите + чтобы начать.
                    </Caption>
                  </Box>
                )}
              </>
            )}
            <div style={{ height: 88 }} />
          </>
        )}
      </PullToRefresh>

      {!error && (
        <FixedLayout vertical="bottom">
          <Box style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
            <button className="fab" onClick={openCreate} aria-label="Создать доску идей">
              <Icon28AddOutline />
            </button>
          </Box>
        </FixedLayout>
      )}

      {modal}

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
