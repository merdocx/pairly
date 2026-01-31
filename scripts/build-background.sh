#!/bin/bash
# Сборка в фоне: не блокирует терминал и не упирается в таймаут (CI/IDE).
# Лог: .build.log в корне репозитория.
# Использует последовательную сборку (backend → web), чтобы пик потребления RAM был только от Next.js.
# Запуск: ./scripts/build-background.sh или npm run build:bg

set -e
cd "$(dirname "$0")/.."
LOG=.build.log

echo "Сборка запущена (последовательно: backend, затем web), лог: $LOG"
# Последовательно: сначала backend (tsc, мало памяти), затем web с лимитом 1.2 GB.
# Так пик RAM = ~1.2 GB вместо ~1.5+ GB при параллельной сборке.
nohup env -i HOME="$HOME" PATH="$PATH" \
  NODE_OPTIONS="--max-old-space-size=1228" \
  NEXT_TELEMETRY_DISABLED=1 \
  npm run build:sequential >> "$LOG" 2>&1 &
echo "PID: $!. Для проверки: tail -f $LOG"
