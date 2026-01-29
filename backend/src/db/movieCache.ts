import { getPool } from './pool.js';

export type MovieCacheType = 'movie' | 'tv';

export async function getMovieCache<T>(tmdbId: number, type: MovieCacheType): Promise<T | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT data FROM movie_cache WHERE tmdb_id = $1 AND type = $2 AND updated_at > now() - interval '7 days'`,
    [tmdbId, type]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].data as T;
}

export async function setMovieCache(tmdbId: number, type: MovieCacheType, data: unknown): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO movie_cache (tmdb_id, type, data, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (tmdb_id, type) DO UPDATE SET data = $3, updated_at = now()`,
    [tmdbId, type, JSON.stringify(data)]
  );
}
