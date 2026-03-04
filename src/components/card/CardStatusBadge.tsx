import { Badge } from '@vkontakte/vkui';

interface Props {
  visible: boolean;
}

export function CardStatusBadge({ visible }: Props) {
  if (!visible) return null;
  return <Badge mode="prominent">Выбрано</Badge>;
}
