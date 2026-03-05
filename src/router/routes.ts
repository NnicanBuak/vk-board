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
  ]),
]);

export const router = createHashRouter(root.getRoutes());

export const PANELS = {
  HOME: 'home',
  BOARD: 'board',
} as const;
