# myvet.kz 🐾

Дневник здоровья для животных с эпилепсией.

## Быстрый старт

### 1. Клонируй и установи
```bash
git clone https://github.com/amanovasm/myvet.git
cd myvet
npm run setup
```

### 2. Создай проект в Supabase
1. Зайди на [supabase.com](https://supabase.com) → New Project
2. Скопируй URL и anon key из Settings → API
3. Заполни `.env.local`

### 3. Запусти SQL схему
В Supabase → SQL Editor → вставь содержимое `supabase/migrations/001_initial_schema.sql` → Run

### 4. Получи Anthropic API key
1. Зайди на [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Добавь в `.env.local`

### 5. Запускай
```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

## Deploy на Vercel

```bash
# Один раз
npx vercel link

# Каждый деплой
npx vercel --prod
```

Или просто push в main — Vercel задеплоит автоматически если подключён GitHub.

## Структура

| Страница | Путь | Описание |
|---|---|---|
| Главная | `/` | Дашборд — состояние сегодня |
| Чек-ин | `/checkin` | Ежедневный чек-ин |
| События | `/events` | История health events |
| Новое событие | `/events/new` | Создать health event |
| Лечение | `/medications` | Текущая схема + история |
| Профиль | `/pet` | Профиль Мави |
| Дайджест | `/digest` | AI-анализ недели |
| Отчёт | `/report` | Отчёт для врача |

## Переменные окружения

```env
NEXT_PUBLIC_SUPABASE_URL=        # из Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # из Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=       # из Supabase → Settings → API
ANTHROPIC_API_KEY=               # из console.anthropic.com
NEXT_PUBLIC_APP_URL=             # http://localhost:3000 или https://myvet.kz
```
