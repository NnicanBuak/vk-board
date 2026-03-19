import { useState } from 'react';
import {
  Box,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FixedLayout,
  Button,
  SegmentedControl,
} from '@vkontakte/vkui';
import { Icon28AddOutline, Icon16Like, Icon16LikeOutline } from '@vkontakte/icons';
import { CardForm } from '../card/CardForm';
import type { Card } from '../../types/card';

const MODAL_CARD = 'bs_card_form';

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
}

export function BrainstormBoard({
  cards, canEdit, userId,
  addCard, toggleLike, onCardClick, onSnackbar,
}: BrainstormBoardProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [sort, setSort] = useState<'likes' | 'date'>('likes');

  const sorted = [...cards].sort((a, b) =>
    sort === 'likes'
      ? b.likeCount - a.likeCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleCardSave = async (data: { title: string; description?: string; url?: string }) => {
    try {
      await addCard({ ...data, columnId: null });
      setActiveModal(null);
    } catch (e) {
      onSnackbar((e as Error).message);
    }
  };

  return (
    <>
      <div className="brainstorm">
        <div className="brainstorm__sort">
          <SegmentedControl
            size="m"
            value={sort}
            onChange={(v) => setSort(v as 'likes' | 'date')}
            options={[
              { label: '❤ По голосам', value: 'likes' },
              { label: '🕐 По дате', value: 'date' },
            ]}
          />
        </div>

        {sorted.length === 0 ? (
          <div className="brainstorm__empty">
            <p>Пока нет идей</p>
            {canEdit && (
              <Button onClick={() => setActiveModal(MODAL_CARD)}>
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

      {canEdit && (
        <FixedLayout vertical="bottom">
          <div className="page-inner">
            <Box style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
              <button className="fab" onClick={() => setActiveModal(MODAL_CARD)} aria-label="Добавить идею">
                <Icon28AddOutline />
              </button>
            </Box>
          </div>
        </FixedLayout>
      )}

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id={MODAL_CARD}
          hideCloseButton
          header={<ModalPageHeader>Новая идея</ModalPageHeader>}
        >
          <CardForm
            onSave={handleCardSave}
            onCancel={() => setActiveModal(null)}
          />
        </ModalPage>
      </ModalRoot>
    </>
  );
}
