import { Card, Box, Headline, Caption, Link, ButtonGroup, Button } from '@vkontakte/vkui';
import { Icon28LikeFillRed, Icon24LikeOutline, Icon16CheckCircle } from '@vkontakte/icons';
import type { Card as CardType } from '../../types/card';
import { formatRelative } from '../../utils/formatDate';

interface Props {
  card: CardType;
  currentUserId: number;
  isAdmin: boolean;
  onLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onUnselect: () => void;
}

export function CardItem({ card, currentUserId, isAdmin, onLike, onEdit, onDelete, onSelect, onUnselect }: Props) {
  const liked = card.likedBy.includes(currentUserId);
  const isOwn = card.authorId === currentUserId;
  const canModify = isOwn || isAdmin;
  const isSelected = card.status === 'selected';

  return (
    <Card
      mode="shadow"
      style={isSelected ? { border: '1.5px solid var(--vkui--color_icon_positive)' } : undefined}
    >
      <Box style={{ padding: '12px 14px' }}>
        {/* Заголовок + лайк + кнопка победителя */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Headline weight="2" style={{ wordBreak: 'break-word' }}>
              {card.title}
            </Headline>
            {isSelected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Icon16CheckCircle style={{ color: 'var(--vkui--color_icon_positive)', flexShrink: 0 }} />
                <Caption style={{ color: 'var(--vkui--color_icon_positive)' }}>Выбрана</Caption>
              </div>
            )}
          </div>
          <Button
            mode="secondary"
            size="s"
            appearance="neutral"
            before={
              <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {liked
                  ? <Icon28LikeFillRed style={{ width: 24, height: 24 }} />
                  : <Icon24LikeOutline />
                }
              </span>
            }
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            style={{ flexShrink: 0, borderRadius: 50, width: 72, justifyContent: 'center', color: liked ? 'var(--vkui--color_icon_negative)' : undefined }}
          >
            {card.likeCount}
          </Button>
        </div>

        {/* Дата */}
        <Caption style={{ color: 'var(--vkui--color_text_tertiary)', marginTop: 6 }}>
          {formatRelative(card.createdAt)}
        </Caption>

        {/* Описание */}
        {card.description && (
          <Caption style={{ marginTop: 6, color: 'var(--vkui--color_text_secondary)', wordBreak: 'break-word' }}>
            {card.description}
          </Caption>
        )}

        {/* Ссылка */}
        {card.url && (
          <Link
            href={card.url}
            target="_blank"
            style={{ fontSize: 12, marginTop: 6, display: 'block', wordBreak: 'break-all' }}
          >
            {card.url.length > 45 ? card.url.slice(0, 45) + '…' : card.url}
          </Link>
        )}

        {/* Действия */}
        {(canModify || isAdmin) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            {canModify ? (
              <ButtonGroup mode="horizontal" gap="s">
                <Button
                  mode="tertiary"
                  size="s"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  Изменить
                </Button>
                <Button
                  mode="tertiary"
                  size="s"
                  appearance="negative"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  Удалить
                </Button>
              </ButtonGroup>
            ) : <div />}
            {isAdmin && !isSelected && (
              <Button
                mode="primary"
                size="s"
                appearance="positive"
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
              >
                Выбрать
              </Button>
            )}
            {isAdmin && isSelected && (
              <Button
                mode="primary"
                size="s"
                appearance="negative"
                onClick={(e) => { e.stopPropagation(); onUnselect(); }}
              >
                Снять
              </Button>
            )}
          </div>
        )}

      </Box>
    </Card>
  );
}
