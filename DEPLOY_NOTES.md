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
npm run build              # пересборка backend + web
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
sudo nginx -t && sudo systemctl reload nginx  # проверить и перезагрузить Nginx
sudo certbot renew --dry-run   # проверить продление SSL
```

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

## Ссылки

- Сайт: https://pairlyapp.ru и https://www.pairlyapp.ru
- API health: https://pairlyapp.ru/api/health
