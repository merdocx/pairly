-- Поддержка сериалов в watchlist и ratings: тип media_type ('movie' | 'tv')
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv'));
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv'));

-- Пересоздать unique: (user_id, movie_id) -> (user_id, movie_id, media_type)
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS watchlist_user_id_movie_id_key;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_user_id_movie_id_key;
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS watchlist_user_id_movie_id_media_type_key;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_user_id_movie_id_media_type_key;
ALTER TABLE watchlist ADD CONSTRAINT watchlist_user_id_movie_id_media_type_key UNIQUE (user_id, movie_id, media_type);
ALTER TABLE ratings ADD CONSTRAINT ratings_user_id_movie_id_media_type_key UNIQUE (user_id, movie_id, media_type);
