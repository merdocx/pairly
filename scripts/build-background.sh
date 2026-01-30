#!/bin/bash
# Сборка в фоне: не блокирует терминал и не упирается в таймаут (CI/IDE).
# Лог: .build.log в корне репозитория.
# Запуск: ./scripts/build-background.sh или npm run build:bg

set -e
cd "$(dirname "$0")/.."
LOG=.build.log

echo "Сборка запущена, лог: $LOG"
nohup env -i HOME="$HOME" PATH="$PATH" npm run build >> "$LOG" 2>&1 &
echo "PID: $!. Для проверки: tail -f $LOG"
