-- Кэш деталей фильмов/сериалов TMDB в БД (переживает рестарты, меньше обращений к TMDB)
CREATE TABLE IF NOT EXISTS movie_cache (
  tmdb_id INTEGER NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('movie', 'tv')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tmdb_id, type)
);

CREATE INDEX IF NOT EXISTS idx_movie_cache_updated ON movie_cache(updated_at);
