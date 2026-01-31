-- Рейтинг TMDB (vote_average 0–10) для отображения в карточках
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS vote_average REAL;
