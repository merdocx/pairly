#!/bin/bash
# Сборка в фоне: не блокирует терминал и не упирается в таймаут (CI/IDE).
# Лог: .build.log в корне репозитория.
# Запуск: ./scripts/build-background.sh или npm run build:bg

set -e
cd "$(dirname "$0")/.."
LOG=.build.log

echo "Сборка запущена, лог: $LOG"
# Ограничение памяти Node (1.5 GB) — на сервере ~2 GB RAM, иначе сборка может вызвать OOM и обрыв SSH/Cursor.
# Без прокси и телеметрии, чтобы избежать "socks connection closed" и лишних запросов.
nohup env -i HOME="$HOME" PATH="$PATH" \
  NODE_OPTIONS="--max-old-space-size=1536" \
  NEXT_TELEMETRY_DISABLED=1 \
  npm run build >> "$LOG" 2>&1 &
echo "PID: $!. Для проверки: tail -f $LOG"
