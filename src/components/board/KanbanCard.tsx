import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon16Like, Icon16LikeOutline } from '@vkontakte/icons';
import type { Card } from '../../types/card';

const AVATAR_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#00897b', '#f4511e', '#33b679', '#fb8c00'];
function assigneeColor(uid: number) { return AVATAR_COLORS[uid % AVATAR_COLORS.length]; }

function isOverdue(dueDate: string) { return new Date(dueDate) < new Date(); }
function isDueSoon(dueDate: string) {
  const d = new Date(dueDate);
  const now = new Date();
  return d >= now && d.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
}
function formatDueDate(dueDate: string) {
  const d = new Date(dueDate);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

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

        <div className="kcard__meta">
          {card.dueDate && (
            <span className={`kcard__due${isDueSoon(card.dueDate) ? ' kcard__due--soon' : ''}${isOverdue(card.dueDate) ? ' kcard__due--overdue' : ''}`}>
              {formatDueDate(card.dueDate)}
            </span>
          )}
          {card.assignees.length > 0 && (
            <div className="kcard__assignees">
              {card.assignees.slice(0, 3).map((uid) => (
                <div key={uid} className="kcard__assignee" style={{ background: assigneeColor(uid) }}>
                  {String(uid).slice(-1)}
                </div>
              ))}
              {card.assignees.length > 3 && (
                <div className="kcard__assignee kcard__assignee--more">+{card.assignees.length - 3}</div>
              )}
            </div>
          )}
        </div>

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
