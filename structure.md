myvet/
├── app/
│   ├── layout.tsx          # Root layout, PWA meta tags
│   ├── page.tsx            # Dashboard (главный экран)
│   ├── checkin/
│   │   └── page.tsx        # Ежедневный чек-ин
│   ├── events/
│   │   ├── page.tsx        # История health events
│   │   └── new/page.tsx    # Новый health event
│   ├── medications/
│   │   └── page.tsx        # Лечение + история изменений
│   ├── pet/
│   │   └── page.tsx        # Профиль Мави
│   ├── digest/
│   │   └── page.tsx        # AI-дайджест
│   └── report/
│       └── page.tsx        # Отчёт для врача
├── components/
│   ├── ui/                 # shadcn компоненты
│   ├── checkin-form.tsx
│   ├── event-form.tsx
│   ├── medication-form.tsx
│   └── nav.tsx
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── ai.ts               # Claude Haiku digest
│   └── utils.ts
├── public/
│   ├── manifest.json       # PWA manifest
│   └── icons/              # App icons
├── supabase/
│   └── migrations/         # SQL схема БД
├── scripts/
│   └── setup.sh            # One-click setup
├── .env.example
└── package.json
