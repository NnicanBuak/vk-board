import { useState, useRef, useEffect } from 'react';
import {
  ModalRoot,
  ModalPage,
  ModalPageContent,
  ModalPageHeader,
  Button,
  ActionSheet,
  ActionSheetItem,
  Separator,
} from '@vkontakte/vkui';
import { Icon16Like, Icon16LikeOutline, Icon16SortArrowUp, Icon16SortArrowDown, Icon16ClockOutline } from '@vkontakte/icons';
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
  registerFabAction?: (handler: (() => void) | null) => void;
}

export function BrainstormBoard({
  cards, canEdit, userId,
  addCard, toggleLike, onCardClick, onSnackbar, registerFabAction,
}: BrainstormBoardProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [sort, setSort] = useState<'likes' | 'date'>('likes');

  useEffect(() => {
    if (!canEdit || !registerFabAction) return undefined;
    registerFabAction(() => setActiveModal(MODAL_CARD));
    return () => registerFabAction(null);
  }, [canEdit, registerFabAction]);
  const [direction, setDirection] = useState<'desc' | 'asc'>('desc');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sorted = [...cards].sort((a, b) => {
    const mul = direction === 'desc' ? 1 : -1;
    if (sort === 'likes') {
      return mul * (b.likeCount - a.likeCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return mul * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const handleSortPointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      setShowSortSheet(true);
    }, 400);
  };

  const handleSortPointerUp = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      setDirection(d => d === 'desc' ? 'asc' : 'desc');
    }
  };

  const handleSortPointerLeave = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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
        <div className="brainstorm__header">
          <button
            ref={sortBtnRef}
            className="brainstorm__sort-btn"
            onPointerDown={handleSortPointerDown}
            onPointerUp={handleSortPointerUp}
            onPointerLeave={handleSortPointerLeave}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Сортировка"
          >
            {direction === 'desc' ? <Icon16SortArrowDown /> : <Icon16SortArrowUp />}
            {sort === 'likes' ? 'По лайкам' : 'По дате'}
          </button>
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


      {showSortSheet && (
        <ActionSheet onClose={() => setShowSortSheet(false)} toggleRef={sortBtnRef}>
          <ActionSheetItem
            before={<Icon16Like />}
            onClick={() => { setSort('likes'); setShowSortSheet(false); }}
          >
            По лайкам
          </ActionSheetItem>
          <Separator />
          <ActionSheetItem
            before={<Icon16ClockOutline />}
            onClick={() => { setSort('date'); setShowSortSheet(false); }}
          >
            По дате
          </ActionSheetItem>
        </ActionSheet>
      )}

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id={MODAL_CARD}
          dynamicContentHeight
          hideCloseButton
          header={<ModalPageHeader>Новая идея</ModalPageHeader>}
        >
          <ModalPageContent>
            <CardForm
              onSave={handleCardSave}
              onCancel={() => setActiveModal(null)}
            />
          </ModalPageContent>
        </ModalPage>
      </ModalRoot>
    </>
  );
}
