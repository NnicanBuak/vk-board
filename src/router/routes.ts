import {
  createHashRouter,
  createPanel,
  createView,
  createRoot,
} from '@vkontakte/vk-mini-apps-router';

export const router = createHashRouter([
  createRoot('root', [
    createView('main', [
      createPanel('home', '/'),
      createPanel('board', '/board/:boardId'),
    ]),
  ]),
]);

export const PANELS = {
  HOME: 'home',
  BOARD: 'board',
} as const;
