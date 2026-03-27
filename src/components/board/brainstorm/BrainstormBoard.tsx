import { useState, useEffect, useMemo } from 'react';
import {
  ModalRoot,
  Button,
} from '@vkontakte/vkui';
import { Icon16Like, Icon16LikeOutline } from '@vkontakte/icons';
import { CreateCardModal } from '../../modals/CreateCardModal';
import type { Card } from '../../../types/card';

const BRAINSTORM_MODAL_IDS = {
  createCard: 'bs_card_form',
} as const;

type BrainstormModalId =
  (typeof BRAINSTORM_MODAL_IDS)[keyof typeof BRAINSTORM_MODAL_IDS];

interface IdeaCardProps {
  card: Card;
  currentUserId: number;
  onClick: () => void;
  onLike: () => void;
}

function IdeaCard({ card, currentUserId, onClick, onLike }: IdeaCardProps) {
  const liked = card.likedBy.includes(currentUserId);
  return (
    <div
      className="idea-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {card.imageUrl && (
        <div
          className="idea-card__preview"
          style={{ backgroundImage: `url(/api/images?url=${encodeURIComponent(card.imageUrl)})` }}
        />
      )}
      <div className="idea-card__body">
        {card.tags.length > 0 && (
          <div className="idea-card__tags">
            {card.tags.map((tag) => (
              <span
                key={tag.id}
                className="idea-card__tag"
                style={{ background: tag.color + '33', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="idea-card__title">{card.title}</div>
        {card.description && (
          <p className="idea-card__desc">{card.description}</p>
        )}
      </div>
      <div className="idea-card__footer">
        {card.status === 'selected' && (
          <span className="idea-card__winner">Победитель</span>
        )}
        <button
          className={`idea-card__like${liked ? ' idea-card__like--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          aria-label={liked ? 'Убрать лайк' : 'Лайк'}
        >
          {liked ? <Icon16Like /> : <Icon16LikeOutline />}
          {card.likeCount > 0 && <span>{card.likeCount}</span>}
        </button>
      </div>
    </div>
  );
}

interface BrainstormBoardProps {
  cards: Card[];
  canEdit: boolean;
  userId: number;
  addCard: (data: { title: string; description?: string; url?: string; columnId: string | null }) => Promise<Card>;
  toggleLike: (cardId: string, userId: number) => void;
  onCardClick: (card: Card) => void;
  onSnackbar: (msg: string) => void;
  registerFabAction?: (handler: (() => void) | null) => void;
  sortMode: 'likes' | 'date';
  sortDirection: 'desc' | 'asc';
}

export function BrainstormBoard({
  cards,
  canEdit,
  userId,
  addCard,
  toggleLike,
  onCardClick,
  onSnackbar,
  registerFabAction,
  sortMode,
  sortDirection,
}: BrainstormBoardProps) {
  const [activeModal, setActiveModal] = useState<BrainstormModalId | null>(null);
  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    if (!canEdit || !registerFabAction) return undefined;
    registerFabAction(() => setActiveModal(BRAINSTORM_MODAL_IDS.createCard));
    return () => registerFabAction(null);
  }, [canEdit, registerFabAction]);

  const sorted = useMemo(() => {
    const mul = sortDirection === 'desc' ? 1 : -1;
    return [...cards].sort((a, b) => {
      if (sortMode === 'likes') {
        return mul * (b.likeCount - a.likeCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return mul * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }, [cards, sortMode, sortDirection]);

  const handleCardSave = async (data: {
    title: string;
    description?: string;
    url?: string;
  }) => {
    await addCard({ ...data, columnId: null });
  };

  return (
    <>
      <div className="brainstorm">
        {sorted.length === 0 ? (
          <div className="brainstorm__empty">
            <p>Пока нет идей</p>
            {canEdit && (
              <Button
                onClick={() => setActiveModal(BRAINSTORM_MODAL_IDS.createCard)}
              >
                Добавить первую идею
              </Button>
            )}
          </div>
        ) : (
          <div className="brainstorm__grid">
            {sorted.map((card) => (
              <IdeaCard
                key={card.id}
                card={card}
                currentUserId={userId}
                onClick={() => onCardClick(card)}
                onLike={() => toggleLike(card.id, userId)}
              />
            ))}
          </div>
        )}

        <div style={{ height: 88 }} />
      </div>


      <ModalRoot activeModal={activeModal} onClose={closeModal}>
        <CreateCardModal
          id={BRAINSTORM_MODAL_IDS.createCard}
          open={activeModal === BRAINSTORM_MODAL_IDS.createCard}
          title="Новая идея"
          onClose={closeModal}
          onSave={handleCardSave}
          onError={onSnackbar}
        />
      </ModalRoot>
    </>
  );
}
