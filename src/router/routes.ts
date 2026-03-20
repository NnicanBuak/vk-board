import {
  createHashRouter,
  createPanel,
  createView,
  createRoot,
} from '@vkontakte/vk-mini-apps-router';

const root = createRoot('root', [
  createView('main', [
    createPanel('home', '/'),
    createPanel('board', '/board/:boardId'),
    createPanel('board-access', '/board/:boardId/access'),
  ]),
]);

export const router = createHashRouter(root.getRoutes());

export const PANELS = {
  HOME: 'home',
  BOARD: 'board',
  BOARD_ACCESS: 'board-access',
} as const;
