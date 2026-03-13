import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon16Like, Icon16LikeOutline } from '@vkontakte/icons';
import type { Card } from '../../types/card';

interface Props {
  card: Card;
  currentUserId: number;
  onClick?: () => void;
  onLike?: () => void;
  isOverlay?: boolean;
}

export function KanbanCard({ card, currentUserId, onClick, onLike, isOverlay = false }: Props) {
  const liked = card.likedBy.includes(currentUserId);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: isOverlay,
  });

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
      }}
      className={`kcard${isDragging ? ' kcard--ghost' : ''}${isOverlay ? ' kcard--lifted' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
    >
      {card.imageUrl && (
        <div
          className="kcard__preview"
          style={{ backgroundImage: `url(/api/images?url=${encodeURIComponent(card.imageUrl)})` }}
        />
      )}

      <div className="kcard__body">
        {card.tags.length > 0 && (
          <div className="kcard__tags">
            {card.tags.map((tag) => (
              <span
                key={tag.id}
                className="kcard__tag"
                style={{ background: tag.color + '33', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="kcard__title">{card.title}</div>

        {card.description && (
          <div className="kcard__desc">{card.description}</div>
        )}
      </div>

      <div className="kcard__footer">
        {card.status === 'selected' && (
          <span className="kcard__winner">Победитель</span>
        )}
        <button
          className={`kcard__like${liked ? ' kcard__like--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onLike?.(); }}
          aria-label={liked ? 'Убрать лайк' : 'Лайк'}
        >
          {liked ? <Icon16Like /> : <Icon16LikeOutline />}
          {card.likeCount > 0 && <span>{card.likeCount}</span>}
        </button>
      </div>
    </div>
  );
}
