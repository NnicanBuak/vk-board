import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

/** Returns a human-readable relative time string in Russian, e.g. "5 минут назад". */
export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ru });
}
