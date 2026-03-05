import { useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  PanelHeaderButton,
  Group,
  Header,
  Button,
  SegmentedControl,
  Spinner,
  PullToRefresh,
  Snackbar,
  Div,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
} from '@vkontakte/vkui';
import { Icon28ShareOutline, Icon28StatisticsOutline } from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';

import { useBoardDetail } from '../hooks/useBoardDetail';
import { useCards } from '../hooks/useCards';
import { useUser } from '../store/UserContext';
import { CardItem } from '../components/card/CardItem';
import { CardForm } from '../components/card/CardForm';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { ResultsContent } from '../components/results/ResultsContent';
import { buildShareLink } from '../utils/buildShareLink';
import type { SortMode } from '../api/cards';
import type { Card } from '../types/card';

const MODAL_CARD = 'card_form';
const MODAL_RESULTS = 'results';

interface Props {
  id: string;
}

export function BoardPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const params = useParams<'boardId'>();
  const boardId = params?.boardId ?? '';
  const { user } = useUser();
  const userId = user?.userId ?? 0;

  const [sort, setSort] = useState<SortMode>('date');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const { board, loading: boardLoading, error: boardError, refresh: refreshBoard } = useBoardDetail(boardId);
  const { cards, loading: cardsLoading, error: cardsError, refresh: refreshCards, addCard, updateCard, removeCard, toggleLike } = useCards(boardId, sort);

  const isAdmin = board?.myRole === 'admin';
  const loading = boardLoading || cardsLoading;
  const error = boardError ?? cardsError;

  const handleShare = () => {
    bridge.send('VKWebAppShare', { link: buildShareLink(boardId) }).catch(() => {
      navigator.showPopout(null);
    });
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setActiveModal(MODAL_CARD);
  };

  const handleDelete = async (cardId: string) => {
    try {
      await removeCard(cardId);
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const handleSelect = async (cardId: string) => {
    try {
      await updateCard(cardId, { status: 'selected' });
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const handleCardSave = async (data: { title: string; description?: string; url?: string }) => {
    try {
      if (editingCard) {
        await updateCard(editingCard.id, data);
      } else {
        await addCard(data);
      }
      setActiveModal(null);
      setEditingCard(null);
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => { setActiveModal(null); setEditingCard(null); }}>
      <ModalPage
        id={MODAL_RESULTS}
        header={
          <ModalPageHeader
            after={<PanelHeaderClose onClick={() => setActiveModal(null)} />}
          >
            Итоги
          </ModalPageHeader>
        }
      >
        <ResultsContent cards={cards} onClose={() => setActiveModal(null)} />
      </ModalPage>
      <ModalPage
        id={MODAL_CARD}
        header={
          <ModalPageHeader
            after={<PanelHeaderClose onClick={() => { setActiveModal(null); setEditingCard(null); }} />}
          >
            {editingCard ? 'Редактировать' : 'Новая карточка'}
          </ModalPageHeader>
        }
      >
        <CardForm
          initial={editingCard ?? undefined}
          onSave={handleCardSave}
          onCancel={() => { setActiveModal(null); setEditingCard(null); }}
        />
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => navigator.back()} />}
        after={
          <div style={{ display: 'flex' }}>
            {isAdmin && (
              <PanelHeaderButton onClick={() => setActiveModal(MODAL_RESULTS)}>
                <Icon28StatisticsOutline />
              </PanelHeaderButton>
            )}
            <PanelHeaderButton onClick={handleShare}>
              <Icon28ShareOutline />
            </PanelHeaderButton>
          </div>
        }
      >
        {board?.title ?? 'Доска'}
      </PanelHeader>

      <PullToRefresh onRefresh={() => { refreshBoard(); refreshCards(); }} isFetching={loading}>
        {error ? (
          <ErrorPlaceholder message={error} onRetry={() => { refreshBoard(); refreshCards(); }} />
        ) : (
          <>
            <Group>
              <Div>
                <SegmentedControl
                  value={sort}
                  onChange={(val) => setSort(val as SortMode)}
                  options={[
                    { label: 'Новые', value: 'date' },
                    { label: 'Популярные', value: 'likes' },
                  ]}
                />
              </Div>
            </Group>

            <Group
              header={
                <Header after={
                  <Button
                    mode="tertiary"
                    onClick={() => { setEditingCard(null); setActiveModal(MODAL_CARD); }}
                  >
                    + Добавить
                  </Button>
                }>
                  Карточки
                </Header>
              }
            >
              {cardsLoading ? (
                <Div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Spinner />
                </Div>
              ) : cards.length === 0 ? (
                <EmptyState
                  header="Нет карточек"
                  text="Добавьте первую идею"
                  actionLabel="Добавить"
                  onAction={() => { setEditingCard(null); setActiveModal(MODAL_CARD); }}
                />
              ) : (
                cards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    currentUserId={userId}
                    isAdmin={isAdmin}
                    onLike={() => toggleLike(card.id, userId)}
                    onEdit={() => handleEdit(card)}
                    onDelete={() => handleDelete(card.id)}
                    onSelect={() => handleSelect(card.id)}
                  />
                ))
              )}
            </Group>
          </>
        )}
      </PullToRefresh>

      {modal}

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
