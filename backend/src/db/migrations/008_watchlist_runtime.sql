-- Длительность (минуты) для отображения в карточках (из TMDB)
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS runtime INTEGER;
