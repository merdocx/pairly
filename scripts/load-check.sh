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
