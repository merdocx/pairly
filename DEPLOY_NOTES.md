# Развёртывание на сервере (выполнено)

## Что сделано

- **Окружение:** Node.js 20, Docker, Nginx, Certbot, PM2
- **БД:** PostgreSQL и Redis запущены через `docker-compose up -d`, миграции выполнены (БД с нуля)
- **Приложения:** backend и web собраны, запущены через PM2 (`pairly-backend`, `pairly-web`)
- **Nginx:** конфиг для pairlyapp.ru и www, проксирование `/api/` → backend:4000, `/` → Next.js:3000
- **SSL:** Let's Encrypt сертификат получен для pairlyapp.ru и www.pairlyapp.ru
- **Автозапуск:** PM2 настроен на автозапуск при перезагрузке (`pm2 startup` выполнен)

## TMDB

API ключ и v4 access token прописаны в `.env` и `backend/.env`. Сервер в Европе — запросы к `api.themoviedb.org` и постеры с `image.tmdb.org` идут **напрямую** (без прокси и без записей в `/etc/hosts`). В коде используется обычный `fetch()` к `https://api.themoviedb.org/3`, Next.js тянет картинки с `image.tmdb.org` при оптимизации изображений.

## Обязательно сделать вручную

### 1. ~~TMDB API ключ~~ — настроено

### 2. Постеры и /etc/hosts (если сервер в РФ/Беларуси)

По [docs/RECOMMENDATIONS.md](docs/RECOMMENDATIONS.md): если сервер в России или Беларуси, TMDB может блокировать запросы. Варианты:

- Либо перенести приложение на зарубежный сервер (рекомендуется) — тогда обход не нужен.
- Либо добавить в `/etc/hosts` IP для `api.themoviedb.org` и при необходимости для `image.tmdb.org` (инструкция в RECOMMENDATIONS.md, раздел 7.1).

Текущий сервер: IP **144.124.248.179**. Если он за рубежом, постеры и API TMDB должны работать без правок hosts.

## Обновление с GitHub (после git pull)

Чтобы увидеть изменения на проде после `git pull`:

```bash
cd /root/pairly
git pull
# Рекомендуется: сборка в фоне, чтобы не обрывать SSH/Cursor при нехватке памяти или таймауте
npm run build:bg
tail -f .build.log          # дождаться окончания (в конце — таблица Route (app) и «ƒ (Dynamic)»)
# Важно: рестартить PM2 только после полного завершения сборки, иначе Next не найдёт .next → 502
pm2 restart pairly-backend pairly-web
```

Либо сборка в текущей сессии (на сервере с ~2 GB RAM лучше ограничить память Node):

```bash
NODE_OPTIONS=--max-old-space-size=1536 npm run build
pm2 restart pairly-backend pairly-web
```

## Полезные команды

```bash
cd /root/pairly
docker-compose ps          # статус PostgreSQL и Redis
docker-compose up -d        # поднять контейнеры
pm2 list                   # статус приложений
pm2 logs                   # логи
pm2 restart pairly-backend # перезапуск backend (после смены .env)
pm2 restart pairly-web      # перезапуск web
npm run load-check         # нагрузка: память, CPU, диск, PM2, OOM (см. ниже)
sudo nginx -t && sudo systemctl reload nginx  # проверить и перезагрузить Nginx
sudo certbot renew --dry-run   # проверить продление SSL
```

## Нагрузка на сервер (почему обрывается соединение)

Чтобы понять причину обрывов SSH/Cursor или сбоев при сборке, регулярно смотрите нагрузку:

```bash
cd /root/pairly && npm run load-check
```

Скрипт выводит:
- **Uptime и load average** — если нагрузка (1/5/15 мин) близка к числу ядер CPU или выше, сервер перегружен.
- **Память (free -m)** — смотрите на **available**. Если доступно мало (например &lt; 200 MB), при сборке Next.js возможен OOM: ядро убьёт процесс (или SSH), соединение оборвётся.
- **Диск** — если Use% под 100%, возможны ошибки записи и сбои.
- **PM2** — список приложений и потребление памяти (RSS). Два процесса (backend + web) в сумме не должны съедать всю RAM.
- **Топ процессов по памяти** — кто больше всего занимает.
- **OOM в dmesg** — если видите «Out of memory» или «Killed process», причина обрывов — нехватка RAM.

**Рекомендации при нехватке памяти (~2 GB на сервере):**
- Всегда использовать фоновую сборку: `npm run build:bg` (см. выше).
- Не запускать тяжёлые задачи параллельно со сборкой (например, не делать `npm run build` в терминале и одновременно деплой в другом месте).
- Логировать нагрузку до/после обрыва: `npm run load-check >> .load.log 2>&1` (перед сборкой и при следующем входе на сервер — посмотреть `.load.log`).

## Метрики и расширение сервера

**Как понять, чего не хватает:** запустите `npm run load-check`. В конце скрипт выводит краткие рекомендации. Ниже — как интерпретировать метрики и что расширять.

### Память (RAM)

- **available &lt; 200–400 MB** — высокий риск OOM при сборке Next.js. Ядро может убить процесс сборки или SSH.
- **Всего RAM ≤ 2 GB** — для Pairly (PostgreSQL, Redis, PM2 backend + web, сборка Next.js) этого мало. Пик при сборке Next.js — ~1–1.5 GB только на сборку.
- **Рекомендация:** **4 GB RAM** — комфортный минимум для стабильной сборки и работы. 2 GB — только если не собирать на сервере (собирать локально/в CI и деплоить артефакты).

### CPU

- **Load average** (1 / 5 / 15 мин) — если стабильно **выше числа ядер** (например, load 2.0 при 1 ядре), CPU перегружен.
- Сборка Next.js и TypeScript нагружают CPU; при 1 ядре сборка дольше и нагрузка «висит» дольше.
- **Рекомендация:** **2 vCPU** — ускоряет сборку и снижает пики нагрузки. 1 vCPU достаточно для работы приложения, но сборка будет долгой.

### Что расширять в первую очередь

1. **Память до 4 GB** — главный приоритет при обрывах сборки, OOM в dmesg и малом «available» в `free -m`.
2. **CPU до 2 vCPU** — если сборка стабильна, но очень долгая и load average постоянно высокий.

### Оптимизации сборки (уже сделаны)

- **Последовательная сборка в фоне** (`build:bg`): сначала backend (tsc), затем web — пик RAM только от Next.js (~1.2 GB с лимитом), а не от двух процессов сразу.
- **Параллельная сборка** (`npm run build`): backend и web одновременно — быстрее по времени, но пик RAM выше; использовать при достаточном объёме памяти (≥ 4 GB).
- **Лимит памяти Node** в `build-background.sh`: `--max-old-space-size=1228` (1.2 GB) для web, чтобы не выйти за разумный предел при 2 GB RAM.

## Файлы конфигурации

- **Nginx:** `/etc/nginx/sites-available/pairlyapp` (включён через symlink в sites-enabled)
- **Переменные:** `/root/pairly/.env` и `/root/pairly/backend/.env` (должны совпадать по содержимому для backend)
- **JWT_SECRET:** уже сгенерирован и прописан в `.env` (не публиковать)

## Таймауты и сброс соединения

- **Nginx:** увеличить таймауты прокси, чтобы долгие запросы (TMDB, SSR) не обрывались. Пример конфига с `proxy_connect_timeout 60s`, `proxy_send_timeout 120s`, `proxy_read_timeout 120s` — в `docs/nginx-pairlyapp.conf`. На сервере обновить `/etc/nginx/sites-available/pairlyapp` по образцу и выполнить `sudo nginx -t && sudo systemctl reload nginx`.
- **PM2:** в `ecosystem.config.cjs` заданы `kill_timeout` (10s backend, 15s web) — процесс успевает завершить запросы перед SIGKILL при рестарте.
- **Сборка без таймаута (CI/IDE):** при долгой сборке Next.js запускать в фоне: `npm run build:bg` (лог в `.build.log`). Или собирать на сервере после `git pull`: `npm run build` там не ограничен таймаутом агента.

## Белая страница / ошибки после деплоя

- **Backend за Nginx:** в `backend/src/app.ts` включён `app.set('trust proxy', 1)`, чтобы rate-limit и логи не падали из‑за заголовка `X-Forwarded-For`.
- **Next.js «Failed to find Server Action»:** часто из‑за устаревшего кэша. На сервере:
  ```bash
  cd /root/pairly/web && rm -rf .next && npm run build
  pm2 restart pairly-web
  ```
  Пользователям: жёсткое обновление страницы (Ctrl+Shift+R или Cmd+Shift+R).
- **Проверка:** `pm2 logs pairly-web --lines 50` — смотреть ошибки в stderr.

## Устранение неполадок

### «socks connection closed» при сборке

Сообщение появляется, если в окружении заданы переменные прокси (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` или `all_proxy` с адресом SOCKS-прокси), а во время сборки Node/npm/Next.js пытаются использовать этот прокси для исходящих запросов (телеметрия, пакеты и т.д.). Если прокси недоступен или соединение обрывается — возникает ошибка.

**Что сделать:**
- Собирать без прокси: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy npm run build`
- Либо использовать фоновую сборку: `npm run build:bg` — скрипт запускает сборку с очищенным окружением и без телеметрии Next.js (`NEXT_TELEMETRY_DISABLED=1`).

### Обрывы соединения при сборке или при работе Cursor с сервером

Возможные причины на сервере (~2 GB RAM в Европе):

1. **Память:** сборка Next.js может кратко занимать 1–1.5 GB. При нехватке RAM ядро (OOM killer) может завершить процессы, в т.ч. сессию SSH или сам сборку — Cursor теряет соединение.
2. **SSH:** по умолчанию `ClientAliveInterval` в sshd может быть 0 — сервер не шлёт keepalive, длинная пауза или нагрузка приводят к разрыву.

**Что сделать:**
- **Всегда использовать фоновую сборку:** `npm run build:bg` (в скрипте уже заданы `NODE_OPTIONS=--max-old-space-size=1536` и отключение телеметрии). Сессия не держит сборку — обрыв не убивает сборку.
- **На своей машине (Cursor/терминал):** включить SSH keepalive, чтобы соединение не рвалось по таймауту. В `~/.ssh/config`:
  ```
  Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
  ```
- **На сервере (по желанию):** в `/etc/ssh/sshd_config` раскомментировать и выставить `ClientAliveInterval 60` и `ClientAliveCountMax 3`, затем `sudo systemctl reload sshd`. Тогда сервер будет слать keepalive раз в минуту.

### Сайт не открывается в браузере

1. **На сервере:** полная пересборка и перезапуск:
   ```bash
   cd /root/pairly/web && rm -rf .next && cd /root/pairly && npm run build
   pm2 restart pairly-web
   ```
2. **Проверка с сервера:** `curl -sI https://pairlyapp.ru/` — должен быть `HTTP/1.1 200 OK`.
3. **У себя:** жёсткое обновление страницы (Ctrl+Shift+R). Проверить с другого устройства/сети. Если за VPN или корпоративным фаерволом — они могут блокировать доступ.

## Ссылки

- Сайт: https://pairlyapp.ru и https://www.pairlyapp.ru
- API health: https://pairlyapp.ru/api/health
