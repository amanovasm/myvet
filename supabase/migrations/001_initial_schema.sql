-- myvet.kz — полная схема БД v0.1
-- Запускать в Supabase SQL Editor

-- ─── ЖИВОТНОЕ ───────────────────────────────────────────────
create table if not exists pets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  species     text not null check (species in ('cat', 'dog')),
  breed       text,
  birth_date  date,
  gender      text check (gender in ('male', 'female', 'unknown')),
  diagnoses   text,          -- основной + сопутствующие, свободный текст
  allergies   text,          -- противопоказания
  vet_notes   text,          -- постоянные заметки для врача
  created_at  timestamptz default now()
);

-- ─── ВЕС (история) ──────────────────────────────────────────
create table if not exists weight_log (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid references pets(id) on delete cascade,
  weight_kg  numeric(5,3) not null,
  measured_at date not null default current_date,
  note       text,
  created_at timestamptz default now()
);

-- ─── ЕЖЕДНЕВНЫЙ ЧЕК-ИН ──────────────────────────────────────
create table if not exists daily_checkins (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid references pets(id) on delete cascade,
  date        date not null default current_date,
  appetite    smallint not null check (appetite between 1 and 3),
  -- 1 = плохо, 2 = норма, 3 = хорошо
  toilet      smallint not null check (toilet between 1 and 3),
  -- 1 = не ходила, 2 = норма, 3 = много
  activity    smallint not null check (activity between 1 and 3),
  -- 1 = вялая, 2 = норма, 3 = активная
  note        text,
  created_at  timestamptz default now(),
  unique(pet_id, date)       -- один чек-ин в день
);

-- ─── HEALTH EVENTS ──────────────────────────────────────────
create table if not exists health_events (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid references pets(id) on delete cascade,
  identifier    text not null,   -- MAVI-2026-05-22-001, генерируется в app
  event_type    text not null,   -- 'seizure' | 'head_pressing' | 'vomiting' | custom
  direction     text not null check (direction in ('negative', 'neutral', 'positive')),
  occurred_at   timestamptz not null,
  duration_sec  integer,         -- длительность в секундах (для приступов)
  had_aura      boolean,         -- только для приступов
  observations  text,            -- свободный текст: до/во время/после
  created_at    timestamptz default now()
);

-- индекс для быстрой выборки по дате
create index if not exists health_events_occurred_at_idx on health_events(occurred_at desc);

-- ─── СПИСОК ТИПОВ СОБЫТИЙ ────────────────────────────────────
-- стандартные типы + пользовательские
create table if not exists event_types (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid references pets(id) on delete cascade,
  key         text not null,     -- 'seizure', 'head_pressing', etc.
  label_ru    text not null,     -- 'Приступ', 'Хедпрессинг', etc.
  direction   text not null check (direction in ('negative', 'neutral', 'positive')),
  is_default  boolean default false,
  created_at  timestamptz default now()
);

-- дефолтные типы событий
insert into event_types (pet_id, key, label_ru, direction, is_default) values
  (null, 'seizure',        'Приступ',                    'negative', true),
  (null, 'head_pressing',  'Хедпрессинг',                'negative', true),
  (null, 'food_refusal',   'Отказ от еды',               'negative', true),
  (null, 'loaf_position',  'Лежание буханкой',           'neutral',  true),
  (null, 'no_urination',   'Отсутствие мочеиспускания',  'negative', true),
  (null, 'vomiting',       'Рвота',                      'negative', true),
  (null, 'strange_behavior','Странное поведение',         'neutral',  true),
  (null, 'claw_sharpening','Точение когтей',              'positive', true),
  (null, 'meowing',        'Мяуканье / чириканье',       'positive', true),
  (null, 'active_play',    'Активные игры',               'positive', true)
on conflict do nothing;

-- ─── ЛЕЧЕНИЕ ────────────────────────────────────────────────
create table if not exists medications (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid references pets(id) on delete cascade,
  name         text not null,       -- название препарата
  dose_amount  numeric(8,3),        -- доза
  dose_unit    text,                -- 'mg', 'mg/kg', 'ml', 'tab'
  frequency    text,                -- '2 раза в день', '08:00 и 20:00'
  started_at   date not null,       -- дата начала этой версии дозировки
  ended_at     date,                -- null = актуальный препарат
  change_note  text,                -- причина изменения
  created_at   timestamptz default now()
);

-- ─── AI ДАЙДЖЕСТЫ ────────────────────────────────────────────
create table if not exists ai_digests (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid references pets(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  content      text not null,       -- текст дайджеста
  created_at   timestamptz default now()
);

-- ─── RLS (Row Level Security) ────────────────────────────────
-- На MVP — отключаем RLS, работаем как single-user
-- При масштабировании включить и добавить политики по user_id
alter table pets              disable row level security;
alter table weight_log        disable row level security;
alter table daily_checkins    disable row level security;
alter table health_events     disable row level security;
alter table event_types       disable row level security;
alter table medications       disable row level security;
alter table ai_digests        disable row level security;
