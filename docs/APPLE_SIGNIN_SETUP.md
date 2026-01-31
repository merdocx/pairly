# Настройка Sign in with Apple в Apple Developer

Пошаговая инструкция по настройке «Войти через Apple» для Pairly (веб).

---

## Требования

- **Apple Developer Program** (платный аккаунт, $99/год): [developer.apple.com/programs](https://developer.apple.com/programs)
- Доступ в **App Store Connect** не нужен для веб-версии.

---

## 1. Войти в Apple Developer

1. Откройте [developer.apple.com/account](https://developer.apple.com/account).
2. Войдите с Apple ID.
3. В боковом меню выберите **Certificates, Identifiers & Profiles** (или **Identifiers**).

---

## 2. Узнать Team ID и Bundle ID (если ещё нет приложения)

- **Team ID**: в правом верхнем углу страницы аккаунта — **Membership** → скопируйте **Team ID** (10 символов, например `ABC123XYZ0`). Он понадобится для переменной `APPLE_TEAM_ID`.
- Если у вас уже есть приложение (iOS/macOS) — можно использовать его **Bundle ID** как основу. Для веба мы создадим отдельный **Services ID**.

---

## 3. Создать App ID (опционально, для веба не обязателен)

Sign in with Apple для веба работает через **Services ID**. App ID нужен только если вы также делаете нативное приложение.

- Перейдите в **Identifiers** → нажмите **+** (Add).
- Выберите **App IDs** → Continue.
- Выберите **App** → Continue.
- **Description**: например `Pairly`.
- **Bundle ID**: Explicit, например `ru.pairlyapp.app`.
- В списке **Capabilities** включите **Sign in with Apple** (можно оставить по умолчанию «Enable as a primary App ID»).
- Зарегистрируйте (Register).

Если делаете только веб — этот шаг можно пропустить и перейти к созданию Services ID.

---

## 4. Создать Services ID (обязательно для веба)

Services ID — это «клиент» для веб-авторизации (аналог client_id в OAuth).

1. В **Identifiers** нажмите **+** (Add).
2. Выберите **Services IDs** → Continue.
3. **Description**: например `Pairly Web`.
4. **Identifier**: уникальный ID, например `ru.pairlyapp.service` (это будет ваш **APPLE_CLIENT_ID**).
5. Нажмите **Configure** рядом с **Sign in with Apple**.
6. В открывшемся окне:
   - **Primary App ID**: выберите ваш App ID из шага 3 (если создавали) или любой существующий App ID с включённым Sign in with Apple. Если нет — создайте минимальный App ID только с Capability «Sign in with Apple».
   - **Domains and Subdomains**: добавьте ваш домен **без** `https://` и без пути, например:
     - `pairlyapp.ru`
     - для локальной разработки Apple не разрешает `localhost` — тестировать веб можно через ngrok или только на реальном домене.
   - **Return URLs**: добавьте **полный** URL вашего callback. Должен **точно** совпадать с тем, что использует бэкенд (включая `https` и путь):
     - Продакшен: `https://pairlyapp.ru/api/auth/apple/callback`
     - Для теста через ngrok: `https://ваш-поддомен.ngrok.io/api/auth/apple/callback`
   - Return URL не может содержать IP, `localhost` или порт в явном виде (например `:3000`).
7. **Save** → **Continue** → **Register**.

Запомните **Identifier** (Services ID) — это значение для переменной **APPLE_CLIENT_ID**.

---

## 5. Создать ключ (Key) для Sign in with Apple

Этот ключ нужен, чтобы бэкенд мог подписывать запросы к Apple (client_secret).

1. В боковом меню выберите **Keys** (или **Certificates, Identifiers & Profiles** → **Keys**).
2. Нажмите **+** (Create a key).
3. **Key Name**: например `Pairly Sign in with Apple`.
4. Включите галочку **Sign in with Apple** → нажмите **Configure** рядом с ней.
5. **Primary App ID**: выберите тот же App ID, что и в Services ID.
6. **Save** → **Continue** → **Register**.
7. На следующем экране:
   - **Download** — скачайте файл `.p8` (например `AuthKey_XXXXXXXXXX.p8`). Его можно скачать **только один раз**. Сохраните в безопасное место.
   - **Key ID** — скопируйте (например `ABC1DEF2GH`). Это значение для **APPLE_KEY_ID**.
   - **Team ID** и **Client ID** на этой странице тоже видны — можно свериться.

---

## 6. Содержимое .p8 файла (APPLE_PRIVATE_KEY)

Откройте скачанный `.p8` в текстовом редакторе. Содержимое выглядит так:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...
-----END PRIVATE KEY-----
```

- Для переменной окружения **APPLE_PRIVATE_KEY** подойдёт либо:
  - вся строка целиком с переносами строк (в некоторых средах удобнее хранить многострочно),  
  - либо одна строка, где переводы строк заменены на `\n`, например:  
  `"-----BEGIN PRIVATE KEY-----\nMIGTAgEA...\n-----END PRIVATE KEY-----\n"`

В коде Pairly переводы `\n` уже разворачиваются в реальные переносы строк.

---

## 7. Сводка: что подставить в переменные окружения

| Переменная | Где взять |
|------------|-----------|
| **APPLE_CLIENT_ID** | **Identifiers** → ваш **Services ID** (Identifier), например `ru.pairlyapp.service`. |
| **APPLE_TEAM_ID** | **Membership** в аккаунте или страница ключа после создания — 10 символов. |
| **APPLE_KEY_ID** | Страница созданного ключа (Keys) после регистрации — 10 символов. |
| **APPLE_PRIVATE_KEY** | Содержимое скачанного `.p8` (всё от `-----BEGIN...` до `-----END...`), при необходимости с `\n` вместо переносов строк. |
| **APPLE_REDIRECT_URI** | Полный URL callback, **точно** такой же, как в Return URLs в настройках Services ID, например `https://pairlyapp.ru/api/auth/apple/callback`. |

Пример для `.env` (значения замените на свои):

```env
APPLE_CLIENT_ID=ru.pairlyapp.service
APPLE_TEAM_ID=ABC123XYZ0
APPLE_KEY_ID=ABC1DEF2GH
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49...\n-----END PRIVATE KEY-----\n"
APPLE_REDIRECT_URI=https://pairlyapp.ru/api/auth/apple/callback
```

---

## 8. Локальная разработка и тест

- Apple **не принимает** в Return URLs адреса с `localhost` или IP.
- Варианты:
  1. Развернуть тестовый стенд на домене (например `staging.pairlyapp.ru`) и добавить этот домен и Return URL в настройки Services ID.
  2. Использовать **ngrok** (или аналог): выдать наружный URL для локального сервера (например `https://xxxx.ngrok.io`), добавить домен `xxxx.ngrok.io` в **Domains**, а Return URL `https://xxxx.ngrok.io/api/auth/apple/callback` в **Return URLs**. Учтите, что бесплатный ngrok при каждом перезапуске меняет поддомен — его нужно обновлять в Apple и в `APPLE_REDIRECT_URI`.

---

## 9. Проверка

1. Убедитесь, что бэкенд запущен и все переменные заданы.
2. Откройте страницу входа и нажмите **«Войти через Apple»**.
3. Должен произойти редирект на Apple → вход с Apple ID → редирект обратно на ваш сайт и автоматический вход в Pairly.

Если при нажатии кнопки возвращается 503 «Sign in with Apple не настроен» — проверьте, что все пять переменных заданы и бэкенд перезапущен после изменения `.env`.

---

## 10. Полезные ссылки

- [Sign in with Apple (обзор)](https://developer.apple.com/sign-in-with-apple/)
- [Configuring your webpage for Sign in with Apple](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/configuring_your_webpage_for_sign_in_with_apple)
- [Pairly: переменные окружения бэкенда](./DEPLOY.md#sign-in-with-apple-бэкенд)
