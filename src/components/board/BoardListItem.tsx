import { SimpleCell, Badge } from '@vkontakte/vkui';
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
      subtitle={formatRelative(board.createdAt)}
      after={
        <>
          {board.myRole === 'admin' && <Badge mode="prominent">Админ</Badge>}
          <Icon24ChevronRight />
        </>
      }
      multiline
    >
      {board.title}
    </SimpleCell>
  );
}
