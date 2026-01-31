#!/bin/bash
# Снимок нагрузки на сервер: память, CPU, диск, процессы PM2.
# Помогает понять причину обрывов соединения (OOM, нехватка RAM при сборке и т.д.).
# Запуск: ./scripts/load-check.sh или npm run load-check

set -e
cd "$(dirname "$0")/.."

echo "=== $(date -Iseconds) ==="
echo

echo "--- Uptime и нагрузка (load average) ---"
uptime
# load average: 1 min, 5 min, 15 min — если близко к числу ядер CPU или выше, сервер перегружен

echo
echo "--- Память (MB) ---"
free -m
# Смотреть на "available" в строке Mem — если мало (например < 200), возможен OOM при сборке

echo
echo "--- Диск ---"
df -h /
# Если Use% близок к 100%, возможны сбои

echo
echo "--- PM2: приложения Pairly ---"
if command -v pm2 >/dev/null 2>&1; then
  pm2 list 2>/dev/null || true
  echo
  echo "--- Память процессов PM2 (RSS, MB) ---"
  pm2 jlist 2>/dev/null | node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
      (d || []).forEach(p => {
        const mem = p.monit && p.monit.memory ? Math.round(p.monit.memory / 1024 / 1024) : '-';
        console.log(p.name + ': ' + mem + ' MB');
      });
    } catch (_) {}
  " 2>/dev/null || pm2 list
else
  echo "pm2 не найден"
fi

echo
echo "--- Топ-5 процессов по памяти (RSS) ---"
ps -eo rss,pid,comm --sort=-rss 2>/dev/null | head -6 | awk 'NR==1 {print "RSS(KB)\tPID\tCOMMAND"; next} {printf "%d\t%s\t%s\n", $1, $2, $3}'

echo
echo "--- OOM killer (последние записи в dmesg, если есть права) ---"
(dmesg 2>/dev/null | grep -i "out of memory\|oom\|killed process" | tail -3) || echo "(нет доступа к dmesg или записей OOM)"

echo
echo "--- Рекомендации по ресурсам ---"
NPROC=$(nproc 2>/dev/null || echo "1")
AVAIL_KB=$(grep MemAvailable /proc/meminfo 2>/dev/null | awk '{print $2}' || grep MemFree /proc/meminfo 2>/dev/null | awk '{print $2}')
AVAIL_MB=$((AVAIL_KB / 1024))
TOTAL_KB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
TOTAL_MB=$((TOTAL_KB / 1024))
LOAD1=$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo "0")
if [ -n "$AVAIL_MB" ] && [ -n "$TOTAL_MB" ]; then
  echo "Память: всего ${TOTAL_MB} MB, доступно ~${AVAIL_MB} MB. CPU ядер: $NPROC. Load (1 мин): $LOAD1"
  if [ "$AVAIL_MB" -lt 400 ] 2>/dev/null; then
    echo "→ Мало свободной RAM. Рекомендуется увеличить память сервера до 4 GB для стабильной сборки."
  elif [ "$TOTAL_MB" -lt 2048 ] 2>/dev/null; then
    echo "→ RAM ≤ 2 GB. При сборке Next.js возможны OOM. Рекомендуется 4 GB."
  fi
else
  echo "(не удалось прочитать /proc/meminfo)"
fi
