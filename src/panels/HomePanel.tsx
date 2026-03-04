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
  Div,
} from '@vkontakte/vkui';
import { Icon28AddOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

import { useBoards } from '../hooks/useBoards';
import { BoardListItem } from '../components/board/BoardListItem';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';

interface Props {
  id: string;
}

export function HomePanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const { boards, loading, error, refresh, createBoard } = useBoards();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard({ title: title.trim(), description: description.trim() || undefined });
      setTitle('');
      setDescription('');
      setShowForm(false);
      navigator.push(`/board/${board.id}`);
    } catch (e) {
      setSnackbar((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader>Board for Chat</PanelHeader>

      <PullToRefresh onRefresh={refresh} isFetching={loading}>
        {error && <ErrorPlaceholder message={error} onRetry={refresh} />}

        {!error && (
          <>
            <Group
              header={<Header aside={
                <Button
                  mode="tertiary"
                  before={<Icon28AddOutline />}
                  onClick={() => setShowForm((v) => !v)}
                >
                  {showForm ? 'Отмена' : 'Создать'}
                </Button>
              }>
                Мои доски
              </Header>}
            >
              {showForm && (
                <Div>
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
                      placeholder="Опционально"
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
                </Div>
              )}

              {loading && !boards.length ? (
                <Div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Spinner />
                </Div>
              ) : boards.length === 0 ? (
                <EmptyState
                  header="Нет досок"
                  text="Создайте первую доску и поделитесь ею в чате"
                  actionLabel="Создать доску"
                  onAction={() => setShowForm(true)}
                />
              ) : (
                boards.map((board) => (
                  <BoardListItem
                    key={board.id}
                    board={board}
                    onClick={() => navigator.push(`/board/${board.id}`)}
                  />
                ))
              )}
            </Group>
          </>
        )}
      </PullToRefresh>

      {snackbar && (
        <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>
      )}
    </Panel>
  );
}
