#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🐾 myvet.kz — setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Зависимости
echo -e "${YELLOW}▸ Устанавливаем зависимости...${NC}"
npm install --silent
echo -e "${GREEN}✓ Зависимости установлены${NC}"

# 2. .env файл
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo -e "${YELLOW}▸ Создан .env.local — заполни переменные перед запуском${NC}"
  echo ""
  echo -e "${RED}  Нужно заполнить:${NC}"
  echo "  NEXT_PUBLIC_SUPABASE_URL"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "  SUPABASE_SERVICE_ROLE_KEY"
  echo "  ANTHROPIC_API_KEY"
  echo ""
  echo "  После заполнения запусти: npm run dev"
else
  echo -e "${GREEN}✓ .env.local уже существует${NC}"
fi

# 3. Проверяем node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Нужен Node.js 18+. Текущая версия: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js версия OK: $(node -v)${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Setup завершён"
echo ""
echo "Следующие шаги:"
echo "1. Заполни .env.local"
echo "2. Запусти SQL из supabase/migrations/001_initial_schema.sql в Supabase"
echo "3. npm run dev"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━${NC}"
