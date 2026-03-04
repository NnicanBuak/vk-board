import { Placeholder, Button } from '@vkontakte/vkui';
import { Icon56ArticleOutline } from '@vkontakte/icons';

interface Props {
  header: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ header, text, actionLabel, onAction }: Props) {
  return (
    <Placeholder
      icon={<Icon56ArticleOutline />}
      header={header}
      action={actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    >
      {text}
    </Placeholder>
  );
}
