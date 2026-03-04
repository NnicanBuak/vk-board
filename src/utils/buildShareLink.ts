const APP_ID = import.meta.env.VITE_VK_APP_ID ?? '';

/** Returns a VK Mini App deep link to a specific board. */
export function buildShareLink(boardId: string): string {
  return `https://vk.com/app${APP_ID}#/board/${boardId}`;
}
