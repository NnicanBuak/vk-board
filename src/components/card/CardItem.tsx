import { SimpleCell, IconButton, Caption, Link } from '@vkontakte/vkui';
import { Icon24LikeFillRed, Icon24LikeOutline } from '@vkontakte/icons';
import type { Card } from '../../types/card';
import { CardStatusBadge } from './CardStatusBadge';
import { formatRelative } from '../../utils/formatDate';

interface Props {
  card: Card;
  currentUserId: number;
  isAdmin: boolean;
  onLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

export function CardItem({ card, currentUserId, isAdmin, onLike, onEdit, onDelete, onSelect }: Props) {
  const liked = card.likedBy.includes(currentUserId);
  const isOwn = card.authorId === currentUserId;
  const canModify = isOwn || isAdmin;

  return (
    <SimpleCell
      multiline
      after={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CardStatusBadge visible={card.status === 'selected'} />
          <IconButton onClick={onLike} label={liked ? 'Убрать лайк' : 'Лайкнуть'}>
            {liked ? <Icon24LikeFillRed /> : <Icon24LikeOutline />}
          </IconButton>
          <Caption style={{ minWidth: 16, textAlign: 'center' }}>{card.likeCount}</Caption>
        </div>
      }
      subtitle={
        <div>
          <Caption>{formatRelative(card.createdAt)}</Caption>
          {card.description && (
            <Caption style={{ marginTop: 2, color: 'var(--vkui--color_text_secondary)' }}>
              {card.description}
            </Caption>
          )}
          {card.url && (
            <Link href={card.url} target="_blank" style={{ fontSize: 12 }}>
              {card.url.length > 40 ? card.url.slice(0, 40) + '…' : card.url}
            </Link>
          )}
          {canModify && (
            <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
              <Caption
                style={{ color: 'var(--vkui--color_text_accent)', cursor: 'pointer' }}
                onClick={onEdit}
              >
                Изменить
              </Caption>
              <Caption
                style={{ color: 'var(--vkui--color_text_negative)', cursor: 'pointer' }}
                onClick={onDelete}
              >
                Удалить
              </Caption>
              {isAdmin && card.status !== 'selected' && (
                <Caption
                  style={{ color: 'var(--vkui--color_text_positive)', cursor: 'pointer' }}
                  onClick={onSelect}
                >
                  Выбрать
                </Caption>
              )}
            </div>
          )}
        </div>
      }
    >
      {card.title}
    </SimpleCell>
  );
}
