-- Расширение денормализации: описание фильма для списков
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS overview TEXT;
