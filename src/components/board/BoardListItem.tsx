import { SimpleCell, Caption } from '@vkontakte/vkui';
import { Icon24ChevronRight } from '@vkontakte/icons';
import type { Board } from '../../types/board';
import { formatRelative } from '../../utils/formatDate';

interface Props {
  board: Board;
  onClick: () => void;
}

export function BoardListItem({ board, onClick }: Props) {
  return (
    <SimpleCell
      onClick={onClick}
      subtitle={
        <div>
          <Caption style={{ color: 'var(--vkui--color_text_tertiary)' }}>
            {formatRelative(board.createdAt)}
          </Caption>
          {board.description && (
            <Caption style={{ marginTop: 2, color: 'var(--vkui--color_text_secondary)' }}>
              {board.description}
            </Caption>
          )}
        </div>
      }
      after={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {board.myRole === 'admin' && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--vkui--color_text_accent)',
              background: 'var(--vkui--color_background_accent_tinted)',
              borderRadius: 4,
              padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}>
              Админ
            </span>
          )}
          <Icon24ChevronRight />
        </div>
      }
      multiline
    >
      {board.title}
    </SimpleCell>
  );
}
