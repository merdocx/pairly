# Пошаговый план переезда Pairly на другой сервер

Домен: **pairlyapp.ru** (и www).  
Стек: Next.js (web), Express (backend), PostgreSQL, Redis, PM2, Nginx, Let's Encrypt.

**База данных:** разворачивается с нуля (миграции + при необходимости seed). Перенос дампа со старого сервера не требуется.

---

## Фаза 0. Подготовка (до переезда)

### 0.1. Новый сервер

- Арендовать VPS/облако (за рубежом — снимает проблему геоблока TMDB).
- ОС: Ubuntu 22.04 LTS (или аналог).
- Минимум: 1–2 CPU, 2 GB RAM, 20 GB диск.
- Открыть порты: 22 (SSH), 80 (HTTP), 443 (HTTPS).

### 0.2. Доступ

- Настроить SSH-ключ на новый сервер.
- Убедиться, что есть root или sudo.

### 0.3. Что взять со старого сервера (опционально)

- Сохранить актуальный **.env**: `JWT_SECRET`, `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN`, `WEB_ORIGIN` и т.д. — чтобы не настраивать заново. Пароль БД можно оставить как в `.env.example` (pairly) или задать новый при первом запуске.
- **БД и Redis не переносим** — на новом сервере БД создаётся с нуля миграциями, Redis стартует пустым.

---

## Фаза 1. Установка окружения на новом сервере

Выполнять по шагам на **новом** сервере.

### 1.1. Системные пакеты

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx
```

### 1.2. Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

### 1.3. Docker (для PostgreSQL и Redis)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# выйти и зайти по SSH или:
newgrp docker
```

### 1.4. Репозиторий и каталог

```bash
cd /root   # или /home/youruser
git clone https://github.com/merdocx/pairly.git
cd pairly
```

(Либо скопировать проект через rsync/scp со старого сервера, если не хотите тянуть из GitHub.)

---

## Фаза 2. База данных и Redis на новом сервере

### 2.1. Запуск PostgreSQL и Redis

```bash
cd /root/pairly
docker compose up -d
docker compose ps   # postgres и redis в состоянии Up
```

Подождать несколько секунд, пока PostgreSQL поднимется.

### 2.2. Создание БД с нуля (миграции)

Схема и все таблицы создаются миграциями из репозитория:

```bash
cd /root/pairly/backend
npm install
npm run db:migrate
```

Команда выполнит `schema.sql` и все файлы из `src/db/migrations/` (users, pairs, watchlist, ratings, movie_cache и т.д.). Ошибок быть не должно.

При необходимости тестовых данных (опционально):

```bash
npm run db:seed
```

### 2.3. Redis

Redis запускается пустым. Кэш TMDB и прочие данные заполнятся при работе приложения.

---

## Фаза 3. Переменные окружения и сборка

### 3.1. .env

В корне проекта (или где запускаете) создать `.env` по образцу `.env.example`:

```bash
cp .env.example .env
nano .env
```

Обязательно задать:

- `DATABASE_URL=postgresql://pairly:pairly@localhost:5432/pairly`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=<длинный_случайный_ключ>` (например `openssl rand -base64 32`)
- `TMDB_API_KEY=...` и при необходимости `TMDB_ACCESS_TOKEN=...`
- `WEB_ORIGIN=https://pairlyapp.ru,https://www.pairlyapp.ru`
- `PORT=4000`

Пароль БД должен совпадать с тем, что в `docker-compose.yml` (по умолчанию `pairly`).

### 3.2. Сборка приложений

Миграции уже выполнены в фазе 2. Остаётся собрать backend и web:

```bash
cd /root/pairly/backend
npm run build

cd /root/pairly/web
npm install
npm run build
```

### 3.3. PM2

```bash
cd /root/pairly
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # выполнить предложенную команду для автозапуска
pm2 list      # pairly-backend и pairly-web в статусе online
```

Проверка API локально:

```bash
curl -s http://localhost:4000/api/health
curl -s http://localhost:3000 | head -20
```

---

## Фаза 4. Nginx и SSL

### 4.1. Nginx: конфиг для pairlyapp.ru

Создать конфиг (путь может отличаться, например `/etc/nginx/sites-available/pairlyapp`):

```nginx
server {
    listen 80;
    server_name pairlyapp.ru www.pairlyapp.ru;
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Включить сайт и проверить конфиг:

```bash
sudo ln -sf /etc/nginx/sites-available/pairlyapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4.2. Let's Encrypt (HTTPS)

```bash
sudo certbot --nginx -d pairlyapp.ru -d www.pairlyapp.ru
```

Следовать подсказкам (email, согласие). Certbot сам поправит конфиг Nginx на 443 и редирект с 80.

Проверка продления:

```bash
sudo certbot renew --dry-run
```

---

## Фаза 5. DNS и переключение трафика

### 5.1. Записать IP нового сервера

Узнать публичный IP нового сервера:

```bash
curl -s ifconfig.me
```

### 5.2. Уменьшить TTL DNS (заранее, на старом DNS)

В панели регистратора домена для записей **pairlyapp.ru** и **www.pairlyapp.ru** (A или CNAME) поставить TTL 300–600 секунд, чтобы после смены IP кэш быстрее обновился.

### 5.3. Переключить A-записи на новый сервер

В панели домена:

- **A** для **pairlyapp.ru** → IP нового сервера.
- **A** для **www.pairlyapp.ru** → IP нового сервера (или CNAME на pairlyapp.ru, если так было).

Сохранить изменения.

### 5.4. Ожидание распространения DNS

Проверять с своей машины:

```bash
dig pairlyapp.ru +short
dig www.pairlyapp.ru +short
```

Когда оба указывают на новый IP — трафик пошёл на новый сервер.

---

## Фаза 6. Проверка после переезда

- Открыть в браузере: https://pairlyapp.ru и https://www.pairlyapp.ru.
- Проверить: вход, регистрацию, списки, поиск, постеры, API (например через DevTools → Network запросы к `/api/...`).
- Проверить cookie/логин после перезагрузки страницы.
- При необходимости проверить логи: `pm2 logs`, `sudo tail -f /var/log/nginx/error.log`.

---

## Фаза 7. Старый сервер

- Оставить старый сервер включённым на 1–3 дня на случай отката (вернуть DNS на старый IP).
- БД на старом сервере не нужна для отката — на новом она уже с нуля. Если всё стабильно: остановить приложения (`pm2 stop all`), при желании — Docker, затем выключить/удалить сервер.

---

## Чек-лист (кратко)

| Шаг | Действие |
|-----|----------|
| 0 | Сохранить .env со старого сервера (секреты); БД не переносим |
| 1 | Новый сервер: Node 20, Docker, Nginx, certbot |
| 2 | git clone, docker compose up, npm run db:migrate (БД с нуля) |
| 3 | .env, backend build, web build, PM2 start |
| 4 | Nginx конфиг, certbot для pairlyapp.ru и www |
| 5 | DNS: A-записи pairlyapp.ru и www → IP нового сервера |
| 6 | Проверка сайта и API |
| 7 | После стабилизации — остановить старый сервер |

---

## Откат при проблемах

- В DNS вернуть A-записи на IP **старого** сервера.
- Дождаться обновления DNS (по TTL).
- Старый сервер должен быть ещё запущен (приложения и Docker). Пользователи снова окажутся на старом хосте; данные там те же, что были до переключения DNS.
