const STORAGE_KEY = 'vk_idea_boards_recent';
const MAX_RECENT = 10;

export function trackBoardVisit(boardId: string): void {
  const ids = getRecentBoardIds();
  const updated = [boardId, ...ids.filter((id) => id !== boardId)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to persist recent boards', error);
    }
  }
}

export function getRecentBoardIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}
