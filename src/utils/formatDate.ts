import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

/** Returns a human-readable relative time string in Russian, e.g. "5 минут назад". */
export function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 60_000) return 'только что';
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ru });
}
