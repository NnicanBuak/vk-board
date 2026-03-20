# Board for Chat — VK Mini App

Многопользовательская платформа досок для чатов ВКонтакте. Поддерживает три режима работы: Kanban с drag-and-drop, Брейншторм с голосованием и Заметки с форматированным текстом.

## Стек

- **Frontend:** React 18, TypeScript, VKUI, VK Bridge, vk-mini-apps-router, Vite
- **Drag-and-drop:** @dnd-kit/core, @dnd-kit/sortable
- **Rich-text editor:** Tiptap (StarterKit, Image, Link extensions)
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Авторизация:** JWT, проверка `vk_sign` через HMAC-SHA256

## Возможности

### Управление досками

- Создавать доски с названием, описанием и обложкой (загрузка с устройства или из VK Фото)
- Выбирать тип доски при создании: Kanban, Брейншторм, Заметки
- Просматривать список досок с вкладками «Недавние» и «Мои»
- Переименовывать, менять описание и обложку существующей доски
- Удалять доску (только admin/owner)

### Kanban

- Колонки с пользовательскими названиями; «Входящие» — автоматический бэклог для карточек без колонки
- Перетаскивание карточек между колонками через drag-and-drop (@dnd-kit)
- Карточки с названием, описанием, URL, тегами, исполнителями и дедлайном
- Лайки с оптимистичным обновлением UI
- Детальная карточка: редактирование полей, смена колонки, назначение тегов

### Брейншторм

- Сетка идей без колонок
- Голосование лайками; сортировка «По голосам» / «По дате»
- Отмечать карточки как «Победитель» (только admin)
- Итоговый экран: топ-3 по лайкам + выбранные карточки, с возможностью скопировать итог в буфер

### Заметки

- Боковая панель со списком страниц, иерархия через вложенность (parentId)
- Редактор на базе Tiptap: заголовки H1/H2, жирный, курсив, подчёркивание, код, ссылки, изображения
- Автосохранение содержимого

### Доступ и участники

- Два режима видимости доски: **По ссылке** (любой с ссылкой может смотреть) и **Приватная** (только приглашённые)
- Роли: **owner** (создатель), **admin** (VK-администратор чата/сообщества), **editor** (редактор), **viewer** (читатель), **member** (участник)
- Приглашение участников из VK: друзья, участники чата (`messages` scope) или участники сообщества (`groups` scope)
- Смена роли и удаление участников (только admin/owner, кроме owner/admin)

### Прочее

- Присутствие в реальном времени: аватары участников, которые сейчас смотрят доску (через `usePresence`)
- Копирование ссылки-приглашения одной кнопкой
- Pull-to-refresh на всех экранах
- Dev-режим: VK Bridge пропускается, используется фиктивный пользователь `{ userId: 1, firstName: 'Dev' }`

---

## Архитектура фронтенда: особенности VKUI и VK Bridge

### Дерево провайдеров (App.tsx)

Порядок вложенности критичен — каждый слой зависит от предыдущего:

```
App
└── AppBridge                  ← вызывает useVKBridge, получает appearance ДО рендера ConfigProvider
    └── ConfigProvider          ← тема light/dark из VK (не из системы)
        └── AdaptivityProvider  ← адаптация под ширину экрана (mobile/tablet/desktop)
            └── AppRoot         ← точка монтирования VKUI, задаёт CSS-переменные
                └── RouterProvider  ← hash-роутер
                    └── UserProvider  ← React Context с текущим пользователем
                        └── AppView ← панели
```

`useVKBridge` вызывается снаружи `ConfigProvider` намеренно: тема должна быть известна до первого рендера, иначе будет мелькание.

---

### Навигация: панели вместо страниц

В обычном React-приложении роутер **заменяет** компонент при смене URL. В VKUI — **все панели рендерятся сразу**, `View` просто скрывает неактивные.

```
<View activePanel={panel}>
  <HomePanel id="home" />            ← /
  <BoardPanel id="board" />          ← /board/:boardId
  <BoardAccessPanel id="board-access" />  ← /board/:boardId/access
</View>
```

**Зачем:** мгновенные переходы, сохранение состояния и скролла, нет повторных запросов к API при возврате назад.

**Роутер** — `vk-mini-apps-router` поверх hash-роутинга (`#/`, `#/board/123`). Hash обязателен: мини-приложение грузится внутри iframe VK, и history API там недоступен. Константы панелей хранятся в [src/router/routes.ts](src/router/routes.ts) — они связывают URL-паттерн с id панели:

```ts
createPanel("board", "/board/:boardId");
createPanel("board-access", "/board/:boardId/access");
//           ↑ id панели    ↑ URL-паттерн с параметром
```

Навигация — через `useRouteNavigator()` из того же пакета, не через `useNavigate` из react-router.

---

### VK Bridge

VK Bridge — это шина между мини-приложением и клиентом ВКонтакте (iOS/Android/Web). Без него приложение не знает, кто пользователь, и не может обратиться к API VK.

Весь Bridge-код инкапсулирован в [src/bridge/useVKBridge.ts](src/bridge/useVKBridge.ts). Хук делает три вещи:

**1. Инициализация**

```ts
bridge.send("VKWebAppInit");
```

Сообщает клиенту VK, что приложение готово принимать события. Обязательный первый вызов.

**2. Тема оформления**

```ts
bridge.send("VKWebAppGetConfig"); // однократно при старте
bridge.subscribe(onEvent); // подписка на VKWebAppUpdateConfig
```

VK присылает `appearance: 'light' | 'dark'` — берём у него, не у системы. В dev-режиме используется системная тема браузера. Пользователь может использовать тёмную тему ВКонтакте при светлой системной.

**3. Авторизация**

```ts
bridge.send("VKWebAppGetUserInfo"); // имя, фото пользователя
bridge.send("VKWebAppGetLaunchParams"); // vk_sign для верификации на бэкенде
```

`vk_sign` — HMAC-SHA256 подпись от VK. Бэкенд проверяет её с помощью `VK_SECRET`, чтобы убедиться, что запрос пришёл действительно из VK, а не подделан.

**Dev-режим:** если `import.meta.env.DEV === true`, Bridge полностью пропускается — используется фиктивный пользователь `{ userId: 1, firstName: 'Dev' }`. Это позволяет разрабатывать локально без iframe VK и туннеля.

---

## Деплой (GitHub + Neon + Railway + Vercel)

### 1. Neondb (база данных)

1. Зарегистрироваться на [neon.tech](https://neon.tech), создать проект.
2. В дашборде открыть **Connection Details**.
3. Выбрать **Pooled connection** и скопировать строку подключения вида:
   ```
   postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Эта строка идёт в Railway как `DATABASE_URL`.

> `?sslmode=require` в конце строки обязателен, иначе Prisma откажет в подключении.

---

### 2. Railway (бэкенд)

1. Создать проект на [railway.app](https://railway.app).
2. **New Service → Deploy from GitHub repo** → выбрать этот репозиторий.
3. В настройках сервиса → **Source** → установить **Root Directory**: `/server`.
4. Вкладка **Variables** — добавить переменные:

   | Переменная     | Значение                                                     |
   | -------------- | ------------------------------------------------------------ |
   | `DATABASE_URL` | строка из Neon (с `?sslmode=require`)                        |
   | `JWT_SECRET`   | произвольный секрет ≥32 символов (`openssl rand -base64 32`) |
   | `VK_SECRET`    | сервисный ключ VK-приложения                                 |
   | `FRONTEND_URL` | URL из Vercel (добавить позже)                               |
   | `NODE_ENV`     | `production`                                                 |

   `PORT` **не задавать** — Railway проставляет его сам, приложение читает `process.env.PORT`.

5. **Settings → Networking** → включить публичный домен. Скопировать URL вида `https://your-app.railway.app` — он пойдёт в Vercel как `VITE_API_URL`.

6. При первом деплое Railway запустит `entrypoint.prod.sh`, который прогонит `prisma migrate deploy`, а затем стартует сервер.

---

### 3. Vercel (фронтенд)

1. Зайти на [vercel.com](https://vercel.com), импортировать репозиторий.
2. Vercel автоматически определит Vite. Настройки:
   - **Framework preset**: Vite
   - **Root Directory**: оставить пустым (фронтенд в корне репозитория)
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Добавить переменные окружения:

   | Переменная       | Значение                                                     |
   | ---------------- | ------------------------------------------------------------ |
   | `VITE_API_URL`   | URL Railway-сервиса, например `https://your-app.railway.app` |
   | `VITE_VK_APP_ID` | ID приложения из vk.com/apps                                 |

4. Задеплоить. Скопировать продакшн-URL из Vercel (например `https://your-app.vercel.app`).
5. Вернуться в Railway → Variables → обновить `FRONTEND_URL` на этот URL.

---

### 4. VK-приложение

1. Открыть своё приложение на [vk.com/apps](https://vk.com/apps) → Настройки.
2. В поле **URL мини-приложения** указать URL из Vercel.
3. Скопировать **Сервисный ключ** → `VK_SECRET` в Railway.
4. Скопировать **ID приложения** → `VITE_VK_APP_ID` в Vercel.

---

### 5. GitHub — CI/CD для двух веток

| Ветка  | Vercel                      | Railway                                | Neon        |
| ------ | --------------------------- | -------------------------------------- | ----------- |
| `main` | Production (автоматически)  | Production environment (автоматически) | main branch |
| `dev`  | Preview URL (автоматически) | Staging environment (автоматически)    | dev branch  |

#### Что делает нативная интеграция (без Actions)

- **Vercel** — автоматически деплоит `main` в production и любую другую ветку как preview. Настройки не нужны.
- **Railway** — автодеплоит при push в указанную ветку. Нужно настроить два environment-а (см. ниже).

#### Настройка Railway Environments

1. Railway проект → кнопка окружения сверху → **New Environment** → `Staging`.
2. В `Staging` → создать сервис из того же репозитория → Settings → Source → ветка `dev`.
3. В `Staging` → Variables → добавить те же переменные, но с `DATABASE_URL` из Neon dev-ветки и `FRONTEND_URL` = preview URL из Vercel.
4. Окружение `Production` → Source → ветка `main` (уже настроено).

#### Настройка Neon dev-ветки

1. Neon → Branches → **New Branch** → name: `dev`, source: `main`.
2. Скопировать pooled connection string этой ветки — это `DATABASE_URL` для Railway Staging.

#### Настройка переменных Vercel по окружениям

В Vercel → Project → Settings → Environment Variables:

- `VITE_API_URL` для **Production** = URL Railway Production
- `VITE_API_URL` для **Preview** = URL Railway Staging

#### Что делают workflows

Два файла в `.github/workflows/`:

- **`deploy-production.yml`** — срабатывает на push в `main`: TypeScript-проверка.
- **`deploy-staging.yml`** — срабатывает на push в `dev`: проверяет, что фронтенд и бэкенд собираются без линтеров; предупреждения не блокируют деплой.

Миграции схемы БД выполняет Railway сам при старте контейнера через `entrypoint.prod.sh` (`prisma migrate deploy`). Neon GitHub App (`NEON_API_KEY`, `NEON_PROJECT_ID`) управляет ветками базы данных для PR — создаёт ветку при открытии PR и удаляет при закрытии.

Сам деплой Railway и Vercel запускается их нативной интеграцией параллельно с GitHub Actions.

---

## Запуск локально через Docker

Поднимает Postgres, бэкенд и фронтенд в контейнерах с live reload.

### Требования

- Docker Desktop (Compose v2)

### Настройка

1. Создать `.env` в корне репозитория (скопировать из `.env.example` и заполнить):

   ```env
   NODE_ENV=development
   JWT_SECRET=any-long-string-at-least-32-chars
   VK_SECRET=                        # оставить пустым — сервер примет userId напрямую без проверки подписи
   VITE_API_URL=http://localhost:3001
   VITE_VK_APP_ID=                   # ID VK-приложения или оставить пустым
   ```

2. Запустить:

   ```sh
   docker compose up --build
   ```

   При первом старте бэкенд автоматически выполнит `prisma db push` и создаст схему в локальном Postgres.

3. Доступ:
   - Фронтенд: http://localhost:5173
   - Бэкенд: http://localhost:3001
   - Postgres: `localhost:5432`, user `boarduser`, pass `boardpass`, db `board_for_chat`

4. Live reload через Compose Watch — изменения в `./src` и `./server/src` синхронизируются в контейнеры без перезапуска. Изменение `package.json` вызывает пересборку:

   ```sh
   docker compose up --build --watch
   ```

5. Остановка:

   ```sh
   docker compose down          # остановить контейнеры
   docker compose down -v       # + удалить volume с базой данных
   ```

6. Сбросить схему БД:
   ```sh
   docker compose exec backend npx prisma db push --force-reset
   ```

---

## Запуск локально без Docker

### Требования

- Node.js 18+
- PostgreSQL (локально)

### Бэкенд

```bash
cd server
cp .env.example .env
# Заполнить DATABASE_URL, JWT_SECRET (мин. 32 символа)

npm install
npm run db:push       # применить схему Prisma
npm run db:seed       # (опционально) тестовые данные
npm run dev           # http://localhost:3001
```

### Фронтенд

```bash
# В корне проекта
# Создать .env.local с VITE_API_URL и VITE_VK_APP_ID

npm install
npm run dev           # http://localhost:5173
```

### Туннель для VK

```bash
npx @vkontakte/vk-tunnel --insecure
# Скопировать HTTPS-URL в настройки приложения на vk.com/dev
```

---

## Переменные окружения

### Бэкенд (`server/.env` / Railway Variables)

| Переменная     | Обязательна | Описание                                                                                                                                                                                                                                       |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | **да**      | Строка подключения PostgreSQL. Для Neon — pooled-строка с `?sslmode=require`. Локально: `postgresql://boarduser:boardpass@localhost:5432/board_for_chat`.                                                                                      |
| `JWT_SECRET`   | **да**      | Секрет подписи JWT. Минимум 32 символа. Генерация: `openssl rand -base64 32`. Утечка этого секрета позволяет подделать токены любого пользователя.                                                                                             |
| `VK_SECRET`    | prod        | Сервисный ключ VK-приложения. Используется для проверки HMAC-SHA256 подписи `vk_sign`. **Если не задан или `NODE_ENV=development`** — сервер работает в dev-режиме: принимает `{ userId, firstName, lastName }` напрямую без проверки подписи. |
| `FRONTEND_URL` | **да**      | Разрешённый CORS-origin. В production — URL Vercel (`https://your-app.vercel.app`). Можно передать несколько через запятую. В non-production режиме дополнительно разрешается `*.vercel.app`.                                                  |
| `PORT`         | нет         | Порт HTTP-сервера. По умолчанию `3001`. Railway задаёт автоматически — не переопределять в Variables.                                                                                                                                          |
| `NODE_ENV`     | нет         | `production` — включает строгую валидацию VK-подписи и отключает автоматическое разрешение `*.vercel.app` в CORS. По умолчанию `development`.                                                                                                  |

### Фронтенд (`.env` / Vercel Environment Variables)

| Переменная       | Обязательна | Описание                                                                                                                    |
| ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`   | **да**      | Базовый URL бэкенда без `/api` и без trailing slash. Локально: `http://localhost:3001`. Прод: Railway URL.                  |
| `VITE_VK_APP_ID` | **да**      | Числовой ID VK-приложения. Нужен для инициализации VK Bridge и запросов к VK API (галерея фото, участники чата/сообщества). |

> В dev-режиме (`NODE_ENV=development` / `vite dev`) фронтенд подставляет `userId=1` автоматически и не обращается к VK Bridge. `VITE_VK_APP_ID` в этом случае не используется.

---

## Структура проекта

```
vk-mini-app/
├── src/                          # Фронтенд (React + VKUI)
│   ├── api/                      # API-клиент: auth, boards, cards, tags, notes
│   ├── bridge/                   # useVKBridge — инициализация VK Bridge
│   ├── components/
│   │   ├── board/                # KanbanBoard, BrainstormBoard, KanbanCard, KanbanColumn, CardDetailModal
│   │   ├── card/                 # CardForm (общая форма создания карточки)
│   │   ├── notes/                # NotesBoard, NoteSidebar, NoteEditor (Tiptap)
│   │   └── common/               # ErrorPlaceholder, EmptyState
│   ├── hooks/                    # useBoards, useBoardDetail, useCards, useColumns, useNotes, usePresence
│   ├── panels/
│   │   ├── HomePanel.tsx         # Список досок, создание новой доски
│   │   ├── BoardPanel.tsx        # Роутинг по типу доски: Kanban / Brainstorm / Notes
│   │   └── BoardAccessPanel.tsx  # Управление видимостью и участниками
│   ├── router/                   # Hash-роутер (vk-mini-apps-router), константы PANELS
│   ├── store/                    # UserContext — React Context с текущим пользователем
│   ├── types/                    # TypeScript-интерфейсы (Board, Card, Note, Column, Tag, VKUser)
│   └── utils/                    # buildShareLink, recentBoards
├── server/                       # Бэкенд (Node.js + Express + Prisma)
│   ├── prisma/                   # schema.prisma, seed.ts
│   └── src/
│       ├── middleware/            # JWT-мидлвара
│       └── routes/               # REST API: /auth /boards /cards /columns /likes /tags /notes /upload /images
├── .env.example                  # Шаблон переменных окружения
└── README.md
```

---

## История изменений

### 2026-03-20

- Добавлены три типа досок: **Kanban** (колонки + drag-and-drop через @dnd-kit), **Брейншторм** (сетка с голосованием), **Заметки** (Tiptap-редактор с иерархией страниц)
- `BoardPanel` переработан: маршрутизирует рендеринг к соответствующему компоненту доски по полю `boardType`
- Добавлена панель **BoardAccessPanel** (`/board/:boardId/access`): управление видимостью (`public` / `private`) и приглашение участников через VK Bridge (друзья, участники чата, участники сообщества)
- Расширена модель ролей: `owner`, `admin`, `editor`, `viewer`, `member`
- Kanban-карточки поддерживают назначение исполнителей и дедлайна
- В `HomePanel` добавлен выбор типа доски при создании, загрузка обложки (с устройства или из VK Фото)

---

## Лицензия

MIT
