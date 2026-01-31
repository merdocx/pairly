# Кеширование данных (в т.ч. TMDB)

## 1. Redis — кеш ответов TMDB API (in-memory)

**Файл:** `backend/src/db/redis.ts`  
**Подключение:** `REDIS_URL` (по умолчанию `redis://localhost:6379`)

- **cacheGet(key)** — чтение JSON по ключу
- **cacheSet(key, value, ttlSeconds)** — запись с TTL

Используется в **tmdb.ts** внутри `tmdbFetch()`: перед запросом к TMDB проверяется Redis, после ответа — результат пишется в Redis. Если Redis недоступен, запрос к TMDB выполняется без кеша.

---

## 2. TMDB-сервис (`backend/src/services/tmdb.ts`)

### 2.1 Общая функция запросов: `tmdbFetch(path, cacheKey?, ttl?, opts?)`

- Если заданы `cacheKey` и `ttl`: сначала **Redis** (`cacheGet(cacheKey)`), при попадании — возврат без вызова TMDB.
- Запрос к `https://api.themoviedb.org/3{path}` с `api_key`, `language=ru-RU`, `region=RU`.
- При успехе: **Redis** `cacheSet(cacheKey, data, ttl)` (игнорируем ошибки).

### 2.2 Поиск: `searchMovies(query, page)`

| Параметр   | Значение |
|-----------|----------|
| Ключ Redis | `tmdb:search_multi:{query}:{page}` |
| TTL       | **6 часов** (21600 сек) |
| Источник  | Только Redis → при промахе запрос к TMDB `/search/multi` |

### 2.3 Детали фильма: `getMovieDetail(movieId)`

| Шаг | Действие |
|-----|----------|
| 1   | **PostgreSQL** `movie_cache`: выборка по `tmdb_id` + `type='movie'` и `updated_at > now() - 30 days` |
| 2   | При наличии строки — возврат `data` из БД, TMDB не вызывается |
| 3   | Иначе **Redis** `tmdb:movie:{movieId}`, TTL **30 дней** (2592000 сек) |
| 4   | При промахе — запрос к TMDB `/movie/{movieId}` |
| 5   | Результат пишется в Redis и в **movie_cache** (см. ниже) |

### 2.4 Детали сериала: `getTvDetail(tvId)`

Аналогично фильму:

| Шаг | Действие |
|-----|----------|
| 1   | **PostgreSQL** `movie_cache` по `tmdb_id` + `type='tv'`, `updated_at > now() - 30 days` |
| 2   | При наличии — возврат из БД |
| 3   | Иначе **Redis** `tmdb:tv:{tvId}`, TTL **30 дней** |
| 4   | При промахе — TMDB `/tv/{tvId}` |
| 5   | Результат — в Redis и в таблицу **movie_cache** |

### 2.5 Конфигурация TMDB: `getConfiguration()`

| Параметр   | Значение |
|-----------|----------|
| Ключ Redis | `tmdb:configuration` |
| TTL       | **7 дней** (604800 сек) |
| Источник  | Только Redis → при промахе TMDB `/configuration` |

---

## 3. Таблица PostgreSQL `movie_cache` (долгий кеш деталей фильмов/сериалов)

**Миграция:** `backend/src/db/migrations/003_movie_cache.sql`  
**Файл логики:** `backend/src/db/movieCache.ts`

```sql
CREATE TABLE movie_cache (
  tmdb_id INTEGER NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('movie', 'tv')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tmdb_id, type)
);
```

- **getMovieCache(tmdbId, type)** — выборка `data`, если `updated_at > now() - interval '30 days'`.
- **setMovieCache(tmdbId, type, data)** — `INSERT ... ON CONFLICT (tmdb_id, type) DO UPDATE SET data = $3, updated_at = now()`.

Используется только в `getMovieDetail()` и `getTvDetail()`: первый уровень перед Redis/TMDB; после получения данных из TMDB результат дополнительно сохраняется в `movie_cache`.

---

## 4. Денормализация в таблице `watchlist` (кеш на уровне списка пользователя)

**Миграции:**  
`002_watchlist_denorm.sql`, `004_watchlist_overview.sql`, `007_watchlist_genre.sql`, `008_watchlist_runtime.sql`, `010_watchlist_vote_average.sql`

В `watchlist` хранятся снимки данных TMDB на момент добавления/обновления:

| Колонка        | Описание |
|----------------|----------|
| title          | Название |
| release_date   | Дата выхода |
| poster_path    | Путь к постеру |
| overview       | Описание |
| genre          | Жанры (строка) |
| runtime        | Длительность (мин) |
| vote_average   | Рейтинг TMDB (0–10) |

**Где заполняется:**

1. **POST /api/watchlist/me** (добавить в список): вызывается `getDetail()` (movie/tv) → `detailToDenorm()` → `UPDATE watchlist SET title, release_date, poster_path, overview, genre, runtime, vote_average`.
2. **GET /api/watchlist/me** (мой список): для каждой строки:
   - **useCached** = есть хотя бы `title` или `poster_path`;
   - **needBackfill** = useCached и (нет genre или runtime или vote_average);
   - если useCached и не needBackfill — ответ собирается только из полей `watchlist` (TMDB не вызывается);
   - иначе вызывается `getDetail()` → при needBackfill делается `UPDATE watchlist SET genre, runtime, vote_average`.
3. **GET /api/watchlist/partner**: та же схема useCached/needBackfill по полям watchlist партнёра (для partner needBackfill пока без vote_average в условии — можно выровнять с «моим» списком).
4. **GET /api/watchlist/intersections**: аналогично — useCached, needBackfill, при необходимости запрос к TMDB и backfill genre/runtime (без vote_average в ответе пересечений).

Таким образом, списки «Моё», «Партнёра» и «Общие» при наличии полного кеша в `watchlist` отдают данные без обращений к TMDB.

---

## 5. HTTP Cache-Control (ответы API)

| Маршрут / поведение | Заголовок |
|----------------------|-----------|
| **GET /api/avatars/:filename** | `Cache-Control: public, max-age=86400` (1 сутки) |
| **GET /api/movies/:id** (детали фильма/сериала) | `Cache-Control: public, max-age=3600` (1 час) |

Браузер и промежуточные прокси могут кешировать ответ по этим правилам.

---

## Сводная схема для данных TMDB

```
Запрос детали фильма/сериала (getMovieDetail / getTvDetail):
  1) PostgreSQL movie_cache (30 дней) → есть? вернуть
  2) Redis tmdb:movie/:id или tmdb:tv/:id (30 дней) → есть? вернуть, и записать в movie_cache
  3) Запрос к TMDB API → сохранить в Redis и movie_cache

Поиск (searchMovies):
  1) Redis tmdb:search_multi:{q}:{page} (6 ч) → есть? вернуть
  2) Запрос к TMDB /search/multi

Конфигурация (getConfiguration):
  1) Redis tmdb:configuration (7 дней) → есть? вернуть
  2) Запрос к TMDB /configuration

Списки watchlist (моё / партнёра / пересечения):
  Для каждой позиции: если в watchlist уже есть title/poster_path и все нужные поля (genre, runtime, vote_average для «моего») — отдаём из БД;
  иначе getDetail() (который сам идёт в movie_cache → Redis → TMDB) и при необходимости backfill в watchlist.
```
