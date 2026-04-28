# Messenger

Мессенджер на Node.js + PostgreSQL + Socket.io + React.  
Работает на **бесплатном** тарифе Render — без Docker!

---

## Что внутри

| | |
|---|---|
| Backend | Node.js, Express, Socket.io, PostgreSQL (pg) |
| Frontend | React, Vite, Tailwind CSS, Zustand |
| Хостинг | Render (Blueprint — всё создаётся автоматически) |

**Возможности:**
- ✅ Регистрация по email + @username (как в Telegram)
- ✅ Поиск пользователей по @username или имени
- ✅ Личные чаты (DM)
- ✅ Текстовые сообщения (Enter — отправить, Shift+Enter — новая строка)
- ✅ Файлы: изображения (превью), видео, аудио, документы
- ✅ Drag & Drop для отправки файлов
- ✅ Статус прочтения — двойные синие галочки ✓✓ (как в Telegram)
- ✅ Счётчик непрочитанных в сайдбаре
- ✅ Real-time через WebSocket (Socket.io)
- ✅ Сессия сохраняется (localStorage)

---

## Деплой на Render

### Шаг 1 — Пушим в GitHub

Структура репо должна быть такой (файлы в корне!):
```
my-repo/
├── render.yaml
├── .gitignore
├── backend/
│   ├── package.json
│   ├── server.js
│   └── ...
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── ...
```

```bash
git add .
git commit -m "init"
git push
```

### Шаг 2 — Blueprint на Render

1. Зайди на **render.com** → **New** → **Blueprint**
2. Выбери свой GitHub репо
3. Render найдёт `render.yaml` и создаст:
   - `messenger-backend` — Node.js сервис
   - `messenger-frontend` — Static сайт
   - `messenger-db` — PostgreSQL база

### Шаг 3 — Переменные окружения

После создания сервисов:

**В `messenger-backend` → Environment добавь:**
| Переменная | Значение |
|---|---|
| `CLIENT_ORIGIN` | URL фронтенда, например `https://messenger-frontend.onrender.com` |
| `BACKEND_URL` | URL бэкенда, например `https://messenger-backend.onrender.com` |

> `DATABASE_URL` и `JWT_SECRET` заполняются автоматически из `render.yaml`

**В `messenger-frontend` → Environment добавь:**
| Переменная | Значение |
|---|---|
| `VITE_API_URL` | URL бэкенда, например `https://messenger-backend.onrender.com` |

### Шаг 4 — Редеплой фронтенда

После установки `VITE_API_URL` нажми **Manual Deploy** на фронтенде —  
переменные Vite встраиваются в билд, поэтому нужен пересбор.

### Шаг 5 — Готово!

Открой URL фронтенда → Регистрируйся → Ищи других пользователей по @username → Пиши!

---

## Локальная разработка

### Требования
- Node.js 18+
- PostgreSQL

### Backend
```bash
cd backend
cp .env .env    # заполни DATABASE_URL
npm install
node server.js
```

### Frontend
```bash
cd frontend
cp .env .env    # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

---

## Заметки

- Render free tier "засыпает" после 15 минут неактивности.  
  Первый запрос после сна занимает ~30 сек. Для продакшена — апгрейд до Starter.
- Загруженные файлы хранятся локально в папке `uploads/`.  
  На Render free tier диск **не персистентный** — файлы сбрасываются при рестарте.  
  Для продакшена подключи S3 или Cloudinary.
