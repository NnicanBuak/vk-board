# Board for Chat — VK Mini App

Многопользовательская доска карточек для чатов ВКонтакте. Участники добавляют идеи, голосуют лайками, а администратор выбирает финальный вариант. Подходит для любых командных решений: выбор подарка, места встречи, фильма, задач.

## Почему не аналоги

| | Board for Chat | Miro | Trello |
|---|---|---|---|
| Запуск прямо в ВК | ✅ | ❌ | ❌ |
| Не требует регистрации | ✅ | ❌ | ❌ |
| Открытый код | ✅ | ❌ | ❌ |
| Ориентирован на голосование | ✅ | ❌ | ❌ |

**Проигрывает аналогам в:** отсутствии drag-and-drop и визуальных схем, нет real-time обновлений (WebSocket), нет rich-text в карточках.

## Стек

- **Frontend:** React 18, TypeScript, VKUI, VK Bridge, vk-mini-apps-router, Vite
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Авторизация:** JWT, проверка `vk_sign` через HMAC-SHA256

## Возможности

- Создание досок с названием и описанием
- Список карточек с сортировкой по дате или лайкам
- Добавление, редактирование и удаление карточек (автор — свои, admin — любые)
- Система лайков с оптимистичным обновлением UI
- Роли: **admin** (создатель) и **member** (участник, вступает по ссылке)
- Пометка карточек как «Выбрано» (только admin)
- Шаринг доски через VK Share API
- Модалка итогов: топ‑3 по лайкам + выбранные карточки
- Копирование итогов в буфер для вставки в чат

## Деплой (GitHub + Neon + Railway + Vercel)

### Схема

```
VK Client
    │
    ▼
Vercel (frontend) ──► Railway (backend /api/*) ──► Neon (PostgreSQL)
```

GitHub подключён к Railway и Vercel напрямую — push в `main` автоматически деплоит оба сервиса.

---

### 1. Neon (база данных)

1. Зарегистрируйся на [neon.tech](https://neon.tech), создай проект.
2. В дашборде открой **Connection Details**.
3. Выбери **Pooled connection** (рекомендуется) и скопируй строку подключения вида:
   ```
   postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Эта строка идёт в Railway как `DATABASE_URL`.

> Pooled — значит через PgBouncer. Для Railway это нормально. Главное — `?sslmode=require` в конце строки обязателен, иначе Prisma откажет в подключении. Если соединение работает и миграции проходят, Neon настроен правильно.

---

### 2. Railway (бэкенд)

1. Создай проект на [railway.app](https://railway.app).
2. **New Service → Deploy from GitHub repo** → выбери этот репозиторий.
3. В настройках сервиса → **Source** → установи **Root Directory**: `/server`.
4. Вкладка **Variables** — добавь переменные:

   | Переменная | Значение |
   |---|---|
   | `DATABASE_URL` | строка из Neon (с `?sslmode=require`) |
   | `JWT_SECRET` | произвольный секрет ≥32 символов (`openssl rand -base64 32`) |
   | `VK_SECRET` | сервисный ключ VK-приложения |
   | `FRONTEND_URL` | URL из Vercel (добавишь позже) |
   | `NODE_ENV` | `production` |

   `PORT` **не задавай** — Railway сам проставляет его, приложение читает `process.env.PORT`.

5. **Settings → Networking** → включи публичный домен. Скопируй URL вида `https://your-app.railway.app` — он пойдёт в Vercel как `VITE_API_URL`.

6. При первом деплое Railway запустит `entrypoint.prod.sh`, который прогонит `prisma migrate deploy`, а затем стартует сервер. Если деплоишь без Docker (plain Node), выполни в Railway Shell вручную:
   ```sh
   npx prisma db push
   ```

---

### 3. Vercel (фронтенд)

1. Зайди на [vercel.com](https://vercel.com), импортируй репозиторий.
2. Vercel автоматически определит Vite. Настройки:
   - **Framework preset**: Vite
   - **Root Directory**: оставь пустым (фронтенд в корне репозитория)
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Добавь переменные окружения:

   | Переменная | Значение |
   |---|---|
   | `VITE_API_URL` | URL Railway-сервиса, например `https://your-app.railway.app` |
   | `VITE_VK_APP_ID` | ID приложения из vk.com/apps |

4. Деплой. Скопируй продакшн-URL из Vercel (например `https://your-app.vercel.app`).
5. Вернись в Railway → Variables → обнови `FRONTEND_URL` на этот URL.

---

### 4. VK-приложение

1. Открой своё приложение на [vk.com/apps](https://vk.com/apps) → Настройки.
2. В поле **URL мини-приложения** укажи URL из Vercel.
3. Скопируй **Сервисный ключ** → `VK_SECRET` в Railway.
4. Скопируй **ID приложения** → `VITE_VK_APP_ID` в Vercel.

---

### 5. GitHub — CI/CD для двух веток

Схема деплоя по ветке:

| Ветка | Vercel | Railway | Neon |
|---|---|---|---|
| `main` | Production (автоматически) | Production environment (автоматически) | main branch |
| `dev` | Preview URL (автоматически) | Staging environment (автоматически) | dev branch |

#### Что делает нативная интеграция (без Actions)

- **Vercel** — автоматически деплоит `main` в production и любую другую ветку как preview. Настройки не нужны.
- **Railway** — автодеплоит при push в указанную ветку. Нужно настроить два environment-а (см. ниже).

#### Настройка Railway Environments

1. Railway проект → кнопка окружения сверху → **New Environment** → `Staging`.
2. В `Staging` → создай сервис из того же репозитория → Settings → Source → ветка `dev`.
3. В `Staging` → Variables → добавь те же переменные, но с `DATABASE_URL` из Neon dev-ветки и `FRONTEND_URL` = preview URL из Vercel.
4. Окружение `Production` → Source → ветка `main` (уже настроено).

#### Настройка Neon dev-ветки

1. Neon → Branches → **New Branch** → name: `dev`, source: `main`.
2. Скопируй pooled connection string этой ветки — это `DATABASE_URL` для Railway Staging.

#### Настройка переменных Vercel по окружениям

В Vercel → Project → Settings → Environment Variables:
- `VITE_API_URL` для **Production** = URL Railway Production
- `VITE_API_URL` для **Preview** = URL Railway Staging

#### Что делают workflows

Два файла в `.github/workflows/`:

- **`deploy-production.yml`** — срабатывает на push в `main`: TypeScript-проверка.
- **`deploy-staging.yml`** — срабатывает на push в `dev`: TypeScript-проверка.

Миграции схемы БД выполняет Railway сам при старте контейнера через `entrypoint.prod.sh` (`prisma migrate deploy`). Neon GitHub App (`NEON_API_KEY`, `NEON_PROJECT_ID`) управляет ветками базы данных для PR — создаёт ветку при открытии PR и удаляет при закрытии. Никаких дополнительных секретов в GitHub Actions не нужно.

Сам деплой Railway и Vercel запускается их нативной интеграцией параллельно с GitHub Actions.

---

## Запуск локально через Docker

Поднимает Postgres, бэкенд и фронтенд в контейнерах с live reload.

### Требования

- Docker Desktop (Compose v2)

### Настройка

1. Создай `.env` в корне репозитория:
   ```env
   JWT_SECRET=any-long-string-at-least-32-chars
   VK_SECRET=                        # оставь пустым для dev-режима без проверки VK-подписи
   VITE_API_URL=http://localhost:3001
   VITE_VK_APP_ID=                   # ID VK-приложения или оставь пустым
   ```

2. Запусти:
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
# Заполните DATABASE_URL, JWT_SECRET (мин. 32 символа)

npm install
npm run db:push       # применить схему Prisma
npm run db:seed       # (опционально) тестовые данные
npm run dev           # http://localhost:3001
```

### Фронтенд

```bash
# В корне проекта
# Создай .env.local с VITE_API_URL и VITE_VK_APP_ID

npm install
npm run dev           # http://localhost:5173
```

### Туннель для VK

```bash
npx @vkontakte/vk-tunnel --insecure
# Скопируйте HTTPS-URL в настройки приложения на vk.com/dev
```

---

## Переменные окружения — подробный справочник

### Бэкенд (`server/.env` / Railway Variables)

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | **да** | Строка подключения PostgreSQL. Для Neon — pooled-строка с `?sslmode=require`. Локально: `postgresql://boarduser:boardpass@localhost:5432/board_for_chat`. |
| `JWT_SECRET` | **да** | Секрет подписи JWT. Минимум 32 символа. Генерация: `openssl rand -base64 32`. Утечка этого секрета позволяет подделать токены любого пользователя. |
| `VK_SECRET` | prod | Сервисный ключ VK-приложения. Используется для проверки HMAC-SHA256 подписи `vk_sign`. **Если не задан или `NODE_ENV=development`** — сервер работает в dev-режиме: принимает `{ userId, firstName, lastName }` напрямую без проверки подписи. |
| `FRONTEND_URL` | **да** | Разрешённый CORS-origin. В production — URL Vercel (`https://your-app.vercel.app`). Можно передать несколько через запятую. В non-production режиме дополнительно разрешается `*.vercel.app`. |
| `PORT` | нет | Порт HTTP-сервера. По умолчанию `3001`. Railway задаёт автоматически — не переопределяй в Variables. |
| `NODE_ENV` | нет | `production` — включает строгую валидацию VK-подписи и отключает автоматическое разрешение `*.vercel.app` в CORS. |

### Фронтенд (`.env.local` / Vercel Environment Variables)

| Переменная | Обязательна | Описание |
|---|---|---|
| `VITE_API_URL` | **да** | Базовый URL бэкенда без `/api` и без trailing slash. Локально: `http://localhost:3001`. Прод: Railway URL. |
| `VITE_VK_APP_ID` | **да** | Числовой ID VK-приложения. Нужен для инициализации VK Bridge. |

## Структура проекта

```
vk-mini-app/
├── src/                    # Фронтенд (React + VKUI)
│   ├── api/                # API-клиент и модули запросов
│   ├── bridge/             # Инициализация VK Bridge
│   ├── components/         # UI-компоненты (card, board, results, common)
│   ├── hooks/              # React-хуки для данных
│   ├── panels/             # Экраны: HomePanel, BoardPanel
│   ├── router/             # Hash-роутер (vk-mini-apps-router)
│   ├── store/              # React Context (текущий пользователь)
│   ├── types/              # TypeScript-интерфейсы
│   └── utils/              # Вспомогательные функции
├── server/                 # Бэкенд (Node.js + Express + Prisma)
│   ├── prisma/             # schema.prisma, seed.ts
│   └── src/
│       ├── middleware/     # JWT-мидлвара
│       └── routes/         # REST API: /auth /boards /cards /likes
├── .env.example            # Шаблон переменных фронтенда
└── README.md
```

## Лицензия

MIT
