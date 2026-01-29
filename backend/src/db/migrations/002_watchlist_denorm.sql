-- Денормализация: title, release_date, poster_path из TMDB на момент добавления в список
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS release_date VARCHAR(20);
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS poster_path VARCHAR(500);
