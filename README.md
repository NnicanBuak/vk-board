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

## Запуск локально

### Требования

- Node.js 18+
- PostgreSQL (локально или Docker)

### 1. База данных

```bash
createdb board_for_chat
```

### 2. Бэкенд

```bash
cd server
cp .env.example .env
# Заполните DATABASE_URL, JWT_SECRET (мин. 32 символа), VK_SECRET

npm install
npm run db:push       # применить схему Prisma
npm run db:seed       # (опционально) тестовые данные
npm run dev           # http://localhost:3001
```

### 3. Фронтенд

```bash
# В корне проекта
cp .env.example .env.local
# Заполните VITE_API_URL и VITE_VK_APP_ID

npm install
npm run dev           # http://localhost:5173
```

### 4. Туннель для VK

```bash
npx @vkontakte/vk-tunnel --insecure
# Скопируйте HTTPS-URL в настройки приложения на vk.com/dev
```

## Переменные окружения

### Фронтенд (`.env.local`)

| Переменная | Описание |
|---|---|
| `VITE_API_URL` | URL бэкенда, например `http://localhost:3001/api` |
| `VITE_VK_APP_ID` | ID приложения в VK |

### Бэкенд (`server/.env`)

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения PostgreSQL |
| `JWT_SECRET` | Секрет для подписи JWT (мин. 32 символа) |
| `VK_SECRET` | Сервисный ключ приложения VK (для проверки `vk_sign`) |
| `FRONTEND_URL` | URL фронтенда для CORS (по умолчанию `http://localhost:5173`) |
| `PORT` | Порт сервера (по умолчанию `3001`) |

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
