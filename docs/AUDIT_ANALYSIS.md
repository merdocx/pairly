# Аудит проекта Pairly: оптимизация, безопасность, ошибки

**Дата:** 30.01.2026  
**Версия проекта:** 0.4.6  
**Обновление:** рекомендации из аудита выполнены (см. раздел «Выполненные рекомендации»).

---

## Выполненные рекомендации (30.01.2026)

| Рекомендация | Статус |
|--------------|--------|
| В production не запускать без своего JWT_SECRET | **Выполнено:** в `backend/src/index.ts` при `NODE_ENV=production` и отсутствии/дефолтном JWT_SECRET вызывается `process.exit(1)` с сообщением в stderr. |
| Убрать хранение JWT в localStorage; только httpOnly cookie | **Выполнено:** токен больше не пишется в `localStorage` после login/register; не передаётся в заголовке `Authorization`. В `web/src/lib/api.ts` `getToken()` всегда возвращает `null`; все запросы идут с `credentials: 'include'`, бэкенд идентифицирует по cookie. Удалены `localStorage.setItem/removeItem('token')` из login, register, profile, page. |
| Отдельный rate limit для POST /api/pairs/join | **Выполнено:** в `backend/src/routes/pairs.ts` добавлен `joinPairRateLimit`: 10 запросов на 15 минут с одного IP для `POST /join`. Сообщение при превышении: «Слишком много попыток ввода кода. Попробуйте через 15 минут.» |
| CSP в режиме report-only | **Выполнено:** в `backend/src/app.ts` (Helmet) включена политика report-only с директориями default-src, script-src, style-src, img-src (в т.ч. image.tmdb.org), connect-src, font-src, frame-src (appleid.apple.com). В `web/next.config.js` добавлен заголовок `Content-Security-Policy-Report-Only` для страниц приложения. |
| Удалить неиспользуемый optionalAuth | **Выполнено:** функция `optionalAuth` удалена из `backend/src/middleware/auth.ts`. |

---

## 1. Безопасность

### 1.1 Что уже хорошо

- **SQL:** везде параметризованные запросы (`$1`, `$2`) — риска SQL-инъекций нет. В том числе `ORDER BY` в watchlist строится из значения enum (added_at | rating | title), а не из сырого ввода.
- **Аутентификация:** JWT в httpOnly cookie; пароли через bcrypt (SALT_ROUNDS=10); валидация Zod на register/login. Токен не хранится в localStorage (только cookie).
- **Rate limiting:** auth 20/15 мин, API 120/мин, join пары 10/15 мин; `trust proxy: 1` для учёта IP за Nginx.
- **Helmet:** включён; CORS по `WEB_ORIGIN`; cookie `secure` в production, `sameSite: 'lax'`; CSP в режиме report-only.
- **Старт в production:** в `index.ts` при отсутствии или дефолтном JWT_SECRET приложение завершается с кодом 1; проверяются WEB_ORIGIN, TMDB_API_KEY с предупреждениями в консоль.
- **Ошибки:** в ответах API не отдаётся стек, только сообщение и код; стек пишется только в серверный лог.
- **Frontend:** нет `dangerouslySetInnerHTML`, `eval`, прямого `innerHTML` — риск XSS снижен.

### 1.2 Оставшиеся рекомендации (низкий приоритет)

- **CSP:** при готовности перевести политику из report-only в enforce (проверить, что все скрипты/стили/картинки разрешены).
- **Секреты в .env:** по-прежнему не коммитить реальные ключи; `.gitignore` исключает `.env`, `.env.local`.

---

## 2. Оптимизация

### 2.1 Backend

- **Медленные запросы:** в `pool.ts` логирование запросов дольше 500 ms.
- **Watchlist / TMDB:** p-limit 10, Redis и movie_cache с TTL.
- **GET /me (watchlist):** один запрос рейтингов партнёра, N+1 нет.
- **Пул БД:** `max: 20`, `idleTimeoutMillis: 30000`.
- **Redis:** при отсутствии приложение падает при старте; при необходимости можно сделать кэш опциональным.

### 2.2 Frontend

- **API:** таймаут 15 s, AbortController; поиск с отменой предыдущего запроса.
- **Бандл:** общие компоненты вынесены; при росте — bundle analyzer, dynamic import.

### 2.3 Сеть и деплой

- **NEXT_PUBLIC_API_URL:** при пустом — относительные запросы к тому же хосту.
- **Кэш:** для деталей фильма `Cache-Control: public, max-age=3600`.

---

## 3. Ошибки и устойчивость

### 3.1 Backend

- **Валидация:** Zod на register, login, watchlist, pairs join; ID и media_type проверяются.
- **Ошибки TMDB:** перехватываются, пользователю — короткие сообщения.
- **errorHandler:** стек только в лог, в ответ — «Внутренняя ошибка сервера».

### 3.2 Frontend

- **Ошибки:** используется `getErrorMessage(e)`; при 401 — редирект на `/login` (токен в cookie сбрасывается бэкендом при logout).
- **Toast:** единственный `alert()` остаётся в fallback `useToast()` при отсутствии провайдера — допустимо.

### 3.3 Конфигурация

- **TMDB:** при пустом ключе в production — предупреждение в консоль.
- **Redis/DB:** при недоступности — падение при старте.

---

## 4. Чек-лист рекомендаций

| Приоритет | Область        | Рекомендация | Статус |
|-----------|----------------|--------------|--------|
| Высокий   | Безопасность   | В production не запускать без своего JWT_SECRET. | Выполнено |
| Высокий   | Безопасность   | Только httpOnly cookie, без localStorage. | Выполнено |
| Средний   | Безопасность   | Rate limit для POST /api/pairs/join. | Выполнено |
| Средний   | Безопасность   | CSP report-only. | Выполнено |
| Низкий    | Код            | Удалить optionalAuth. | Выполнено |
| Низкий    | UX             | Заменить alert() на тосты (где уместно). | Оставлен fallback в Toast |
| Низкий    | Оптимизация    | Сортировка по title в SQL при росте списков. | Не требуется пока |
| Низкий    | Надёжность     | Опциональный Redis. | Не реализовано |

---

## 5. Итог

Рекомендации аудита по безопасности и коду выполнены: жёсткая проверка JWT_SECRET в production, отказ от localStorage в пользу только httpOnly cookie, отдельный rate limit для ввода кода пары, CSP в report-only (backend + Next.js), удалён неиспользуемый optionalAuth. Проект в хорошем состоянии для дальнейшей разработки и деплоя.
