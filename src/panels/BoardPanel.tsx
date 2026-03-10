import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  PanelHeaderButton,
  Group,
  Spinner,
  PullToRefresh,
  Snackbar,
  Box,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
  FixedLayout,
  Caption,
  Separator,
  Subhead,
  Text,
  Button,
} from '@vkontakte/vkui';
import {
  Icon28ShareOutline,
  Icon28AddOutline,
} from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';

import { useBoardDetail } from '../hooks/useBoardDetail';
import { useCards } from '../hooks/useCards';
import { useUser } from '../store/UserContext';
import { CardItem } from '../components/card/CardItem';
import { CardForm } from '../components/card/CardForm';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorPlaceholder } from '../components/common/ErrorPlaceholder';
import { buildShareLink } from '../utils/buildShareLink';
import { trackBoardVisit } from '../utils/recentBoards';
import type { Card } from '../types/card';

const MODAL_CARD = 'card_form';

interface Props {
  id: string;
}

export function BoardPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const params = useParams<'boardId'>();
  const boardId = params?.boardId ?? '';

  useEffect(() => {
    if (boardId) trackBoardVisit(boardId);
  }, [boardId]);

  const { user } = useUser();
  const userId = user?.userId ?? 0;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmCard, setConfirmCard] = useState<string | null>(null);

  const { board, loading: boardLoading, error: boardError, refresh: refreshBoard } = useBoardDetail(boardId);
  const { cards, loading: cardsLoading, error: cardsError, refresh: refreshCards, addCard, updateCard, removeCard, toggleLike } = useCards(boardId, 'date');

  const isAdmin = board?.myRole === 'admin';
  const loading = boardLoading || cardsLoading;
  const error = boardError ?? cardsError;

  const participantCount = new Set(cards.map((c) => c.authorId)).size;
  const selectedCards = cards.filter((c) => c.status === 'selected');
  const sortedCards = [...cards].sort((a, b) =>
    (b.status === 'selected' ? 1 : 0) - (a.status === 'selected' ? 1 : 0)
  );

  const handleShare = () => {
    bridge.send('VKWebAppShare', { link: buildShareLink(boardId) }).catch(() => {});
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

  const handleSelect = (cardId: string) => {
    setConfirmCard(cardId);
  };

  const handleUnselect = async (cardId: string) => {
    try {
      await updateCard(cardId, { status: 'default' });
    } catch (e) {
      setSnackbar((e as Error).message);
    }
  };

  const handleConfirm = async () => {
    if (!confirmCard) return;
    const id = confirmCard;
    setConfirmCard(null);
    try {
      await updateCard(id, { status: 'selected' });
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

  const openAddCard = () => {
    setEditingCard(null);
    setActiveModal(MODAL_CARD);
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => { setActiveModal(null); setEditingCard(null); }}>
      <ModalPage
        id={MODAL_CARD}
        header={
          <ModalPageHeader
            after={<PanelHeaderClose onClick={() => { setActiveModal(null); setEditingCard(null); }} />}
          >
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
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => navigator.back()} />}
        after={
          <PanelHeaderButton onClick={handleShare} aria-label="Поделиться">
            <Icon28ShareOutline />
          </PanelHeaderButton>
        }
      >
        {board?.title ?? 'Голосование'}
      </PanelHeader>

      <PullToRefresh onRefresh={() => { refreshBoard(); refreshCards(); }} isFetching={loading}>
        {error ? (
          <ErrorPlaceholder message={error} onRetry={() => { refreshBoard(); refreshCards(); }} />
        ) : (
          <>
            {/* Описание + статистика */}
            <Box style={{ paddingInline: 16, paddingTop: 10, paddingBottom: 6 }}>
              {board?.description && (
                <Caption style={{ color: 'var(--vkui--color_text_secondary)', display: 'block', marginBottom: 4 }}>
                  {board.description}
                </Caption>
              )}
              {!cardsLoading && cards.length > 0 && (
                <Caption style={{ color: 'var(--vkui--color_text_tertiary)' }}>
                  {cards.length} {cards.length === 1 ? 'идея' : cards.length < 5 ? 'идеи' : 'идей'}
                  {participantCount > 0 && ` · ${participantCount} ${participantCount === 1 ? 'участник' : participantCount < 5 ? 'участника' : 'участников'}`}
                </Caption>
              )}
            </Box>

            {/* Список идей */}
            <Group>
              {cardsLoading ? (
                <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
                  <Spinner size="l" />
                </Box>
              ) : cards.length === 0 ? (
                <EmptyState
                  header="Идей пока нет"
                  text="Нажмите + чтобы предложить первую идею"
                  actionLabel="Предложить идею"
                  onAction={openAddCard}
                />
              ) : (
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence initial={false}>
                    {(() => {
                      const items: React.ReactNode[] = [];
                      sortedCards.forEach((card, index) => {
                        const showSeparator =
                          selectedCards.length > 0 &&
                          card.status !== 'selected' &&
                          (index === 0 || sortedCards[index - 1].status === 'selected');
                        if (showSeparator) {
                          items.push(
                            <motion.div
                              key="__separator__"
                              layout
                              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            >
                              <Separator />
                            </motion.div>
                          );
                        }
                        items.push(
                          <motion.div
                            key={card.id}
                            layout
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                          >
                            <CardItem
                              card={card}
                              currentUserId={userId}
                              isAdmin={isAdmin}
                              onLike={() => toggleLike(card.id, userId)}
                              onEdit={() => handleEdit(card)}
                              onDelete={() => handleDelete(card.id)}
                              onSelect={() => handleSelect(card.id)}
                              onUnselect={() => handleUnselect(card.id)}
                            />
                          </motion.div>
                        );
                      });
                      return items;
                    })()}
                  </AnimatePresence>
                </div>
              )}
            </Group>

            {/* Отступ под FAB */}
            <div style={{ height: 88 }} />
          </>
        )}
      </PullToRefresh>

      {/* FAB */}
      {!error && (
        <FixedLayout vertical="bottom">
          <Box style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
            <button className="fab" onClick={openAddCard} aria-label="Предложить идею">
              <Icon28AddOutline />
            </button>
          </Box>
        </FixedLayout>
      )}

      {modal}

      {confirmCard && (
        <div
          onClick={() => setConfirmCard(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--vkui--color_background_modal)',
              borderRadius: 14,
              padding: '20px 20px 14px',
              width: '100%',
              maxWidth: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <Subhead weight="1" style={{ marginBottom: 8 }}>Выбрать победителя?</Subhead>
            <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 20 }}>
              Эта идея будет отмечена как победитель и отображена в начале страницы.
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button mode="primary" appearance="negative" onClick={() => setConfirmCard(null)}>
                Отмена
              </Button>
              <Button mode="primary" appearance="positive" onClick={handleConfirm}>
                Выбрать
              </Button>
            </div>
          </div>
        </div>
      )}

      {snackbar && <Snackbar onClose={() => setSnackbar(null)}>{snackbar}</Snackbar>}
    </Panel>
  );
}
