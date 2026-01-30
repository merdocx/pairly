# Токены из Figma (Untitled / Pairly Mobile Website)

**Файл:** OeztMeyJkgc6hbFlWNBRSm  
**Обновлено:** по данным API Figma

## Цвета

| Элемент | Figma (0–1) | HEX |
|--------|-------------|-----|
| Фон приложения (App) | rgb(0.976, 0.98, 0.984) | `#f9fafb` |
| Фон страниц | #ffffff | `#ffffff` |
| Градиент хедера (начало) | rgb(0.597, 0.062, 0.981) | `#990ffb` |
| Градиент хедера (конец) | rgb(0.901, 0, 0.463) | `#e60076` |
| Оверлей модалки | rgba(0,0,0,0.5) | `rgba(0,0,0,0.5)` |

## Градиент хедера

- Направление: слева направо (gradientHandlePositions 0,0.5 → 1,0.5)
- `linear-gradient(90deg, #990ffb 0%, #e60076 100%)`

## Типографика

- Шрифт: **Inter**
- Лого «Pairly»: 24px, 700
- Заголовки: 16–18px, 600
- Подписи/табы: 12px, 500–600
- Текст: 14px, 400–500

## Структура экранов

- App → Header (градиент) + контент (WatchingPage / SearchPage / ProfilePage) + BottomNav
- Модалки: PairModal, MovieDetail с оверлеем 0.5
- Логин/Регистрация: Card + LoginPage / RegisterPage
