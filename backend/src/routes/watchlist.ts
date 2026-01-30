import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pool.js';
import { authMiddleware, type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getMovieDetail, getTvDetail, getConfiguration, posterPath } from '../services/tmdb.js';

type MediaType = 'movie' | 'tv';

async function getDetail(tmdbId: number, mediaType: MediaType) {
  return mediaType === 'tv' ? getTvDetail(tmdbId) : getMovieDetail(tmdbId);
}

function detailToDenorm(d: Awaited<ReturnType<typeof getMovieDetail>> | Awaited<ReturnType<typeof getTvDetail>> | null, mediaType: MediaType) {
  if (!d) return null;
  if (mediaType === 'tv' && 'name' in d && 'first_air_date' in d)
    return { title: d.name, release_date: d.first_air_date ?? null, poster_path: d.poster_path ?? null, overview: d.overview ?? null };
  if ('title' in d && 'release_date' in d)
    return { title: d.title, release_date: d.release_date ?? null, poster_path: d.poster_path ?? null, overview: d.overview ?? null };
  return null;
}

export const watchlistRouter = Router();
watchlistRouter.use(authMiddleware);

function uid(req: Request & { user: JwtPayload }) {
  return req.user.userId;
}

const sortSchema = z.enum(['added_at', 'rating', 'title']).catch('added_at');

watchlistRouter.get('/me', async (req, res, next) => {
  try {
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const sort = sortSchema.parse(req.query.sort);
    const order = sort === 'rating' ? 'r.rating DESC NULLS LAST' : 'w.added_at DESC';
    const rows = await pool.query(
      `SELECT w.movie_id, w.media_type, w.added_at, r.rating, w.title AS w_title, w.release_date AS w_release_date, w.poster_path AS w_poster_path, w.overview AS w_overview
       FROM watchlist w
       LEFT JOIN ratings r ON r.user_id = w.user_id AND r.movie_id = w.movie_id AND r.media_type = w.media_type
       WHERE w.user_id = $1 ORDER BY ${order}`,
      [userId]
    );
    if (rows.rows.length === 0) return res.json({ items: [] });
    const config = await getConfiguration().catch(() => null);
    const base = config?.images?.secure_base_url || config?.images?.base_url || '';
    let items = await Promise.all(
      rows.rows.map(async (r: { movie_id: number; media_type: MediaType; added_at: Date; rating: number | null; w_title?: string | null; w_release_date?: string | null; w_poster_path?: string | null; w_overview?: string | null }) => {
        const useCached = r.w_title != null || r.w_poster_path != null;
        if (useCached) {
          return {
            movie_id: r.movie_id,
            media_type: r.media_type,
            added_at: r.added_at,
            rating: r.rating ?? null,
            watched: !!r.rating,
            title: r.w_title ?? '',
            release_date: r.w_release_date ?? null,
            poster_path: r.w_poster_path ? posterPath(base, r.w_poster_path, 'w500') : null,
            overview: r.w_overview ?? null,
          };
        }
        const d = await getDetail(r.movie_id, r.media_type).catch(() => null);
        const denorm = detailToDenorm(d, r.media_type);
        return {
          movie_id: r.movie_id,
          media_type: r.media_type,
          added_at: r.added_at,
          rating: r.rating ?? null,
          watched: !!r.rating,
          title: denorm?.title ?? (d && 'title' in d ? d.title : d && 'name' in d ? d.name : ''),
          release_date: denorm?.release_date ?? (d && 'release_date' in d ? d.release_date : d && 'first_air_date' in d ? d.first_air_date : null),
          poster_path: denorm?.poster_path ? posterPath(base, denorm.poster_path, 'w500') : (d && d.poster_path ? posterPath(base, d.poster_path, 'w500') : null),
          overview: denorm?.overview ?? (d?.overview ?? null),
        };
      })
    );
    if (sort === 'title') {
      items = items.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru'));
    }
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.get('/partner', async (req, res, next) => {
  try {
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const pair = await pool.query(
      'SELECT user_a_id, user_b_id FROM pairs WHERE user_a_id = $1 OR user_b_id = $1',
      [userId]
    );
    if (pair.rows.length === 0) throw new AppError(404, 'У вас нет пары', 'NO_PAIR');
    const partnerId = pair.rows[0].user_a_id === userId ? pair.rows[0].user_b_id : pair.rows[0].user_a_id;
    if (!partnerId) return res.json({ items: [] });
    const rows = await pool.query(
      `SELECT w.movie_id, w.media_type, w.added_at, w.title AS w_title, w.release_date AS w_release_date, w.poster_path AS w_poster_path, w.overview AS w_overview
       FROM watchlist w
       LEFT JOIN ratings r ON r.user_id = w.user_id AND r.movie_id = w.movie_id AND r.media_type = w.media_type
       WHERE w.user_id = $1 AND r.rating IS NULL ORDER BY w.added_at DESC`,
      [partnerId]
    );
    const config = await getConfiguration().catch(() => null);
    const base = config?.images?.secure_base_url || config?.images?.base_url || '';
    const items = await Promise.all(
      rows.rows.map(async (r: { movie_id: number; media_type: MediaType; added_at: Date; w_title?: string | null; w_release_date?: string | null; w_poster_path?: string | null; w_overview?: string | null }) => {
        const useCached = r.w_title != null || r.w_poster_path != null;
        if (useCached) {
          return {
            movie_id: r.movie_id,
            media_type: r.media_type,
            added_at: r.added_at,
            title: r.w_title ?? '',
            release_date: r.w_release_date ?? null,
            poster_path: r.w_poster_path ? posterPath(base, r.w_poster_path, 'w500') : null,
            overview: r.w_overview ?? null,
          };
        }
        const d = await getDetail(r.movie_id, r.media_type).catch(() => null);
        const denorm = detailToDenorm(d, r.media_type);
        return {
          movie_id: r.movie_id,
          media_type: r.media_type,
          added_at: r.added_at,
          title: denorm?.title ?? (d && 'title' in d ? d.title : d && 'name' in d ? d.name : ''),
          release_date: denorm?.release_date ?? (d && 'release_date' in d ? d.release_date : d && 'first_air_date' in d ? d.first_air_date : null),
          poster_path: denorm?.poster_path ? posterPath(base, denorm.poster_path, 'w500') : (d && d.poster_path ? posterPath(base, d.poster_path, 'w500') : null),
          overview: denorm?.overview ?? (d?.overview ?? null),
        };
      })
    );
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.get('/intersections', async (req, res, next) => {
  try {
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const pair = await pool.query(
      'SELECT user_a_id, user_b_id FROM pairs WHERE user_a_id = $1 OR user_b_id = $1',
      [userId]
    );
    if (pair.rows.length === 0) throw new AppError(404, 'У вас нет пары', 'NO_PAIR');
    const partnerId = pair.rows[0].user_a_id === userId ? pair.rows[0].user_b_id : pair.rows[0].user_a_id;
    if (!partnerId) return res.json({ items: [] });
    const rows = await pool.query(
      `SELECT w.movie_id, w.media_type, w.title AS w_title, w.release_date AS w_release_date, w.poster_path AS w_poster_path
       FROM watchlist w WHERE w.user_id = $1
       AND EXISTS (SELECT 1 FROM watchlist w2 WHERE w2.user_id = $2 AND w2.movie_id = w.movie_id AND w2.media_type = w.media_type)
       AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.user_id = $1 AND r.movie_id = w.movie_id AND r.media_type = w.media_type)
       AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.user_id = $2 AND r.movie_id = w.movie_id AND r.media_type = w.media_type)`,
      [userId, partnerId]
    );
    const config = await getConfiguration().catch(() => null);
    const base = config?.images?.secure_base_url || config?.images?.base_url || '';
    const items = await Promise.all(
      rows.rows.map(async (r: { movie_id: number; media_type: MediaType; w_title?: string | null; w_release_date?: string | null; w_poster_path?: string | null }) => {
        const useCached = r.w_title != null || r.w_poster_path != null;
        if (useCached) {
          return {
            movie_id: r.movie_id,
            media_type: r.media_type,
            title: r.w_title ?? '',
            release_date: r.w_release_date ?? null,
            poster_path: r.w_poster_path ? posterPath(base, r.w_poster_path, 'w500') : null,
            my_rating: null,
            partner_rating: null,
            average_rating: null,
          };
        }
        const d = await getDetail(r.movie_id, r.media_type).catch(() => null);
        const denorm = detailToDenorm(d, r.media_type);
        return {
          movie_id: r.movie_id,
          media_type: r.media_type,
          title: denorm?.title ?? (d && 'title' in d ? d.title : d && 'name' in d ? d.name : ''),
          release_date: denorm?.release_date ?? (d && 'release_date' in d ? d.release_date : d && 'first_air_date' in d ? d.first_air_date : null),
          poster_path: denorm?.poster_path ? posterPath(base, denorm.poster_path, 'w500') : (d && d.poster_path ? posterPath(base, d.poster_path, 'w500') : null),
          my_rating: null,
          partner_rating: null,
          average_rating: null,
        };
      })
    );
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.post('/me', async (req, res, next) => {
  try {
    const body = z
      .object({ movie_id: z.number().int().positive(), media_type: z.enum(['movie', 'tv']).default('movie') })
      .safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Некорректный movie_id или media_type', 'VALIDATION_ERROR');
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const { movie_id: movieId, media_type: mediaType } = body.data;
    await pool.query(
      'INSERT INTO watchlist (user_id, movie_id, media_type) VALUES ($1, $2, $3) ON CONFLICT (user_id, movie_id, media_type) DO NOTHING',
      [userId, movieId, mediaType]
    );
    const d = await getDetail(movieId, mediaType).catch(() => null);
    const denorm = d ? detailToDenorm(d, mediaType) : null;
    if (denorm?.title != null || denorm?.poster_path != null) {
      await pool.query(
        'UPDATE watchlist SET title = $1, release_date = $2, poster_path = $3, overview = $4 WHERE user_id = $5 AND movie_id = $6 AND media_type = $7',
        [denorm.title ?? null, denorm.release_date ?? null, denorm.poster_path ?? null, denorm.overview ?? null, userId, movieId, mediaType]
      );
    }
    res.status(201).json({ message: mediaType === 'tv' ? 'Сериал добавлен в список' : 'Фильм добавлен в список' });
  } catch (e) {
    next(e);
  }
});

const mediaTypeQuery = z.enum(['movie', 'tv']).catch('movie');

watchlistRouter.delete('/me/:movieId', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId < 1) throw new AppError(400, 'Некорректный ID', 'VALIDATION_ERROR');
    const mediaType = mediaTypeQuery.parse(req.query.type);
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    await pool.query('DELETE FROM ratings WHERE user_id = $1 AND movie_id = $2 AND media_type = $3', [userId, movieId, mediaType]);
    const del = await pool.query('DELETE FROM watchlist WHERE user_id = $1 AND movie_id = $2 AND media_type = $3 RETURNING id', [userId, movieId, mediaType]);
    if (del.rowCount === 0) throw new AppError(404, 'Не найдено в списке', 'NOT_FOUND');
    res.json({ message: 'Удалено из списка' });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.put('/me/:movieId/rate', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId < 1) throw new AppError(400, 'Некорректный ID', 'VALIDATION_ERROR');
    const mediaType = mediaTypeQuery.parse(req.query.type);
    const body = z.object({ rating: z.number().int().min(1).max(10) }).safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Оценка от 1 до 10', 'VALIDATION_ERROR');
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const inList = await pool.query('SELECT id FROM watchlist WHERE user_id = $1 AND movie_id = $2 AND media_type = $3', [userId, movieId, mediaType]);
    if (inList.rows.length === 0) throw new AppError(400, 'Оценку можно поставить только позиции из своего списка', 'NOT_IN_WATCHLIST');
    await pool.query(
      'INSERT INTO ratings (user_id, movie_id, media_type, rating) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, movie_id, media_type) DO UPDATE SET rating = $4, updated_at = now()',
      [userId, movieId, mediaType, body.data.rating]
    );
    res.json({ message: 'Оценка сохранена' });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.delete('/me/:movieId/rate', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId < 1) throw new AppError(400, 'Некорректный ID', 'VALIDATION_ERROR');
    const mediaType = mediaTypeQuery.parse(req.query.type);
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    await pool.query('DELETE FROM ratings WHERE user_id = $1 AND movie_id = $2 AND media_type = $3', [userId, movieId, mediaType]);
    res.json({ message: 'Статус «Просмотрено» снят' });
  } catch (e) {
    next(e);
  }
});
