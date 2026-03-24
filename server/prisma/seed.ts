import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEMO_BOARD_ID = 'demoboard000000000000000000001';
const FAKE_USER_ID = 99999;
const DEV_USER_ID = parseInt(process.env.SEED_USER_ID ?? '1', 10);

async function main() {
  console.log('🌱 Seeding demo board…');

  await prisma.board.deleteMany({ where: { id: DEMO_BOARD_ID } });

  await prisma.board.create({
    data: {
      id: DEMO_BOARD_ID,
      title: 'Идеи для продукта',
      description: 'Собираем фичи: реализованные, в работе и в очереди.',
      creatorId: FAKE_USER_ID,
      roles: {
        createMany: {
          data: [
            { userId: FAKE_USER_ID, role: 'owner' },
            { userId: DEV_USER_ID,  role: 'viewer' },
          ],
        },
      },
      columns: {
        createMany: {
          data: [
            { id: 'col-backlog00000000000000001',   title: 'Идеи',      order: 0 },
            { id: 'col-inprogress000000000000001',  title: 'В работе',  order: 1 },
            { id: 'col-done000000000000000000001',  title: 'Готово',    order: 2 },
          ],
        },
      },
      tags: {
        createMany: {
          data: [
            { id: 'tag-ux000000000001',  name: 'UX',           color: '#7c4dff' },
            { id: 'tag-backend0000001',  name: 'Backend',      color: '#2979ff' },
            { id: 'tag-mobile00000001',  name: 'Mobile',       color: '#00bfa5' },
            { id: 'tag-collab000000001', name: 'Коллаборация', color: '#e040fb' },
            { id: 'tag-idea0000000001',  name: 'Идея',         color: '#ff9800' },
          ],
        },
      },
    },
  });

  // ── Готово ──────────────────────────────────────────────────────────────────
  const done = await Promise.all([
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Kanban-вид доски',
      description: 'Горизонтальные колонки в стиле Trello. Карточки распределяются по колонкам, колонки можно переименовывать и создавать новые.',
      status: 'selected', order: 0,
      tags: { create: [{ tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Полноэкранная карточка',
      description: 'Карточка открывается на весь экран: название, описание, ссылка, теги, комментарии, переключение колонки.',
      status: 'selected', order: 1,
      tags: { create: [{ tagId: 'tag-ux000000000001' }, { tagId: 'tag-mobile00000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Комментарии к карточке',
      description: 'Участники могут оставлять комментарии внутри карточки. Свои комментарии и (для admin) чужие — можно удалять.',
      status: 'selected', order: 2,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Теги на карточках',
      description: 'Цветные теги создаются на уровне доски и назначаются на карточки. Теги отображаются на плитке в канбане.',
      status: 'selected', order: 3,
      tags: { create: [{ tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Прокси для изображений',
      description: 'Маршрут /api/images?url=... транслирует внешние картинки без CORS. Используется для imageUrl карточек.',
      status: 'selected', order: 4,
      tags: { create: [{ tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Копирование ссылки на доску',
      description: 'Кнопка в шапке копирует share-ссылку. Любой по ней автоматически становится участником доски.',
      status: 'selected', order: 5,
      tags: { create: [{ tagId: 'tag-collab000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-done000000000000000000001', authorId: FAKE_USER_ID,
      title: 'Редактирование доски',
      description: 'Администратор может менять название и описание доски через модальное окно, вызываемое из заголовка страницы.',
      status: 'selected', order: 6,
      tags: { create: [{ tagId: 'tag-ux000000000001' }] },
    }}),
  ]);

  // ── В работе ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-inprogress000000000000001', authorId: FAKE_USER_ID,
      title: 'Drag-and-drop карточек',
      description: 'Перетаскивать карточки между колонками и внутри одной колонки. Порядок сохраняется на сервере. Использовать @dnd-kit/core — хорошо работает на touch-экранах.',
      order: 0,
      tags: { create: [{ tagId: 'tag-ux000000000001' }, { tagId: 'tag-mobile00000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-inprogress000000000000001', authorId: FAKE_USER_ID,
      title: 'Тёмная тема',
      description: 'VKUI поддерживает colorScheme. Нужно добавить переключатель и сохранять выбор. Поддержать и OLED-вариант (чисто чёрный фон).',
      order: 1,
      tags: { create: [{ tagId: 'tag-ux000000000001' }, { tagId: 'tag-mobile00000001' }] },
    }}),
  ]);

  // ── Идеи ──────────────────────────────────────────────────────────────────
  const ideas = await Promise.all([
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Push-уведомления через VK Bridge',
      description: 'Уведомлять участников о новых карточках и комментариях. API: VKWebAppAllowMessagesFromGroup + доставка через VK API.',
      url: 'https://dev.vk.com/mini-apps/bridge',
      order: 0,
      tags: { create: [{ tagId: 'tag-mobile00000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Реал-тайм обновления (WebSocket)',
      description: 'Карточки и комментарии появляются у всех участников без перезагрузки. Socket.io на сервере, useWebSocket хук на клиенте.',
      order: 1,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: '@упоминания в комментариях',
      description: 'Писать @имя_участника в комментарии. Упомянутый получает уведомление. Автодополнение по списку участников доски.',
      order: 2,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Чеклист внутри карточки',
      description: 'Подзадачи с чекбоксами, как в Trello. Прогресс отображается на плитке в виде "3/5". Сохраняется в отдельной таблице ChecklistItem.',
      order: 3,
      tags: { create: [{ tagId: 'tag-ux000000000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Назначить исполнителя',
      description: 'Назначать одного или нескольких участников на карточку. Аватары отображаются на плитке. Фильтр по исполнителю.',
      order: 4,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Срок выполнения (due date)',
      description: 'Дедлайн на карточке. Просроченные подсвечиваются красным. Сортировка по дедлайну. Интеграция с VK Календарём при желании.',
      order: 5,
      tags: { create: [{ tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Emoji-реакции на карточки',
      description: 'Вместо (или вместе с) лайками — набор эмодзи-реакций, как в VK. Количество каждой реакции отображается на плитке.',
      order: 6,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Шаблоны досок',
      description: 'Набор готовых шаблонов при создании доски: "Ретроспектива", "Планирование спринта", "Мозговой штурм". Колонки и теги создаются автоматически.',
      order: 7,
      tags: { create: [{ tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Поиск по карточкам',
      description: 'Полнотекстовый поиск внутри доски по заголовку и описанию. Фильтры по тегам, исполнителю, колонке.',
      order: 8,
      tags: { create: [{ tagId: 'tag-ux000000000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Экспорт доски (PDF / CSV)',
      description: 'Скачать все карточки как CSV или красиво сверстанный PDF. Для офлайн-ретроспектив и архивирования.',
      order: 9,
      tags: { create: [{ tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'История действий (Activity log)',
      description: 'Лог всех изменений на доске: кто создал карточку, переместил, прокомментировал. Отображается в боковой панели.',
      order: 10,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'WIP-лимиты на колонки',
      description: 'Ограничение максимального числа карточек в колонке (как в настоящем Kanban). При превышении — предупреждение.',
      order: 11,
      tags: { create: [{ tagId: 'tag-ux000000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Режим "Мозговой штурм" (Miro-стиль)',
      description: 'Свободный холст: стикеры, стрелки, зоны. Перемещение курсором, зум. Совместное редактирование в реальном времени через WebSocket + CRDT.',
      order: 12,
      tags: { create: [{ tagId: 'tag-ux000000000001' }, { tagId: 'tag-collab000000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Голосование в беседе ВК',
      description: 'Бот присылает карточки из доски в беседу как опрос ВК. Участники голосуют прямо в чате, результаты синхронизируются с лайками на доске.',
      order: 13,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-mobile00000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Публикация итогов в беседу ВК',
      description: 'После завершения голосования — автоматически отправить сообщение в беседу с картой результатов и победителем через VK API.',
      order: 14,
      tags: { create: [{ tagId: 'tag-collab000000001' }, { tagId: 'tag-backend0000001' }] },
    }}),
    prisma.card.create({ data: {
      boardId: DEMO_BOARD_ID, columnId: 'col-backlog00000000000000001', authorId: FAKE_USER_ID,
      title: 'Гостевой доступ (без авторизации)',
      description: 'Открыть доску по ссылке без VK-аккаунта: только просмотр и лайки. Анонимный userId хранится в localStorage.',
      order: 15,
      tags: { create: [{ tagId: 'tag-backend0000001' }, { tagId: 'tag-mobile00000001' }] },
    }}),
  ]);

  const allCards = [...done, ...ideas];
  console.log(`✅ ${allCards.length} cards created`);

  await prisma.comment.createMany({
    data: [
      { cardId: done[0].id, userId: FAKE_USER_ID, text: 'DnD через @dnd-kit — лучший выбор для мобилок, поддерживает touch из коробки.' },
      { cardId: done[1].id, userId: DEV_USER_ID,  text: 'Можно добавить галерею изображений через swipe внутри карточки.' },
      { cardId: done[2].id, userId: FAKE_USER_ID, text: 'Хорошо бы показывать аватар ВК рядом с именем автора комментария.' },
      { cardId: ideas[1].id, userId: FAKE_USER_ID, text: 'Socket.io или Ably — у второго бесплатный tier достаточен для старта.' },
      { cardId: ideas[1].id, userId: DEV_USER_ID,  text: 'Можно начать с polling каждые 5с, потом мигрировать на WS.' },
      { cardId: ideas[11].id, userId: FAKE_USER_ID, text: 'Для холста можно взять tldraw — MIT-лицензия, отличная поддержка мобилок.' },
    ],
  });

  console.log('✅ Comments seeded');
  console.log('');
  console.log(`📋 Board ID: ${DEMO_BOARD_ID}`);
  console.log(`   localStorage.setItem('vk_idea_boards_recent', JSON.stringify(['${DEMO_BOARD_ID}']))`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
