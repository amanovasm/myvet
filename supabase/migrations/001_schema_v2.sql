-- myvet.kz — полная схема v0.2
-- Запускать в Supabase SQL Editor

create table if not exists pets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  species     text not null check (species in ('cat', 'dog')),
  breed       text,
  birth_date  date,
  gender      text check (gender in ('male', 'female', 'unknown')),
  diagnoses   text,
  allergies   text,
  vet_notes   text,
  created_at  timestamptz default now()
);

create table if not exists weight_log (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid references pets(id) on delete cascade,
  weight_kg   numeric(5,3) not null,
  measured_at date not null default current_date,
  note        text,
  created_at  timestamptz default now()
);

create table if not exists daily_checkins (
  id              uuid primary key default gen_random_uuid(),
  pet_id          uuid references pets(id) on delete cascade,
  date            date not null default current_date,
  appetite        text not null,
  stool_count     smallint default 0,
  stool_type      text,
  stool_smell     boolean,
  urine_count     smallint default 0,
  urine_volume    text,
  activity        text not null,
  water_intake    text not null,
  note            text,
  created_at      timestamptz default now(),
  unique(pet_id, date)
);

create table if not exists health_events (
  id                  uuid primary key default gen_random_uuid(),
  pet_id              uuid references pets(id) on delete cascade,
  identifier          text not null,
  event_type          text not null,
  direction           text not null check (direction in ('negative', 'neutral', 'positive')),
  occurred_at         timestamptz not null,
  duration_sec        integer,
  had_aura            boolean,
  observations_before text,
  description         text,
  post_ictal_type     text,
  post_ictal_notes    text,
  observations_after  text,
  created_at          timestamptz default now()
);

create index if not exists health_events_occurred_idx on health_events(occurred_at desc);

create table if not exists medications (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid references pets(id) on delete cascade,
  name         text not null,
  dose_amount  numeric(8,3),
  dose_unit    text,
  started_at   date not null,
  ended_at     date,
  change_note  text,
  created_at   timestamptz default now()
);

create table if not exists medication_schedules (
  id              uuid primary key default gen_random_uuid(),
  medication_id   uuid references medications(id) on delete cascade,
  pet_id          uuid references pets(id) on delete cascade,
  scheduled_time  time not null,
  dose_amount     numeric(8,3),
  dose_unit       text,
  created_at      timestamptz default now()
);

create table if not exists medication_doses (
  id              uuid primary key default gen_random_uuid(),
  pet_id          uuid references pets(id) on delete cascade,
  medication_id   uuid references medications(id) on delete cascade,
  schedule_id     uuid references medication_schedules(id) on delete cascade,
  dose_date       date not null default current_date,
  scheduled_time  text not null,
  taken_at        timestamptz,
  skipped         boolean default false,
  created_at      timestamptz default now(),
  unique(schedule_id, dose_date)
);

create table if not exists ai_digests (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid references pets(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  content      text not null,
  created_at   timestamptz default now()
);

-- Отключаем RLS для MVP (single user)
alter table pets               disable row level security;
alter table weight_log         disable row level security;
alter table daily_checkins     disable row level security;
alter table health_events      disable row level security;
alter table medications        disable row level security;
alter table medication_schedules disable row level security;
alter table medication_doses   disable row level security;
alter table ai_digests         disable row level security;
