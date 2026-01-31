-- Жанры для отображения в карточках (строка через запятую из TMDB)
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS genre VARCHAR(500);
