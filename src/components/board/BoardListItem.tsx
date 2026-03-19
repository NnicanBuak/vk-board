import type { Board, BoardType } from '../../types/board';
import { formatRelative } from '../../utils/formatDate';

const PREVIEW_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

function pickGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PREVIEW_GRADIENTS[hash % PREVIEW_GRADIENTS.length];
}

const TYPE_LABELS: Record<BoardType, string> = {
  kanban:    '📋 Kanban',
  brainstorm:'🧠 Брейншторм',
  notes:     '📓 Заметки',
};

interface Props {
  board: Board;
  onClick: () => void;
}

export function BoardListItem({ board, onClick }: Props) {
  const previewStyle = board.coverImage
    ? {
        backgroundImage: `url(/api/images?url=${encodeURIComponent(board.coverImage)})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : { background: pickGradient(board.id) };

  return (
    <div className="board-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="board-card__preview" style={previewStyle} />
      <div className="board-card__body">
        <div className="board-card__title">{board.title}</div>
        {board.description && (
          <div className="board-card__desc">{board.description}</div>
        )}
        <div className="board-card__footer">
          <span className="board-card__date">{formatRelative(board.createdAt)}</span>
          <span className="board-card__type">{TYPE_LABELS[board.boardType]}</span>
        </div>
      </div>
    </div>
  );
}
