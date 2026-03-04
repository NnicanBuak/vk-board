import { Placeholder, Button } from '@vkontakte/vkui';
import { Icon56ErrorTriangleOutline } from '@vkontakte/icons';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorPlaceholder({ message = 'Что-то пошло не так', onRetry }: Props) {
  return (
    <Placeholder
      icon={<Icon56ErrorTriangleOutline />}
      header="Ошибка"
      action={onRetry && <Button onClick={onRetry}>Повторить</Button>}
    >
      {message}
    </Placeholder>
  );
}
