import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pool.js';
import { authMiddleware, type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getMovieDetail, getConfiguration, posterPath } from '../services/tmdb.js';

export const watchlistRouter = Router();
watchlistRouter.use(authMiddleware);

function uid(req: Request & { user: JwtPayload }) {
  return req.user.userId;
}

watchlistRouter.get('/me', async (req, res, next) => {
  try {
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const sort = (req.query.sort as string) || 'added_at';
    const order = sort === 'rating' ? 'r.rating DESC NULLS LAST' : 'w.added_at DESC';
    const rows = await pool.query(
      `SELECT w.movie_id, w.added_at, r.rating FROM watchlist w
       LEFT JOIN ratings r ON r.user_id = w.user_id AND r.movie_id = w.movie_id
       WHERE w.user_id = $1 ORDER BY ${order}`,
      [userId]
    );
    if (rows.rows.length === 0) return res.json({ items: [] });
    const config = await getConfiguration().catch(() => null);
    const base = config?.images?.secure_base_url || config?.images?.base_url || '';
    let items = await Promise.all(
      rows.rows.map(async (r) => {
        const d = await getMovieDetail(r.movie_id).catch(() => null);
        return {
          movie_id: r.movie_id,
          added_at: r.added_at,
          rating: r.rating ?? null,
          watched: !!r.rating,
          title: d?.title ?? '',
          release_date: d?.release_date ?? null,
          poster_path: d?.poster_path ? posterPath(base, d.poster_path, 'w500') : null,
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
      `SELECT w.movie_id, w.added_at FROM watchlist w
       LEFT JOIN ratings r ON r.user_id = w.user_id AND r.movie_id = w.movie_id
       WHERE w.user_id = $1 AND r.rating IS NULL ORDER BY w.added_at DESC`,
      [partnerId]
    );
    const config = await getConfiguration().catch(() => null);
    const base = config?.images?.secure_base_url || config?.images?.base_url || '';
    const items = await Promise.all(
      rows.rows.map(async (r) => {
        const d = await getMovieDetail(r.movie_id).catch(() => null);
        return {
          movie_id: r.movie_id,
          added_at: r.added_at,
          title: d?.title ?? '',
          release_date: d?.release_date ?? null,
          poster_path: d?.poster_path ? posterPath(base, d.poster_path, 'w500') : null,
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
      `SELECT w.movie_id FROM watchlist w WHERE w.user_id = $1
       AND EXISTS (SELECT 1 FROM watchlist w2 WHERE w2.user_id = $2 AND w2.movie_id = w.movie_id)
       AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.user_id = $1 AND r.movie_id = w.movie_id)
       AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.user_id = $2 AND r.movie_id = w.movie_id)`,
      [userId, partnerId]
    );
    const config = await getConfiguration().catch(() => null);
    const base = config?.images?.secure_base_url || config?.images?.base_url || '';
    const items = await Promise.all(
      rows.rows.map(async (r) => {
        const d = await getMovieDetail(r.movie_id).catch(() => null);
        const [myR, pr] = await Promise.all([
          pool.query('SELECT rating FROM ratings WHERE user_id = $1 AND movie_id = $2', [userId, r.movie_id]),
          pool.query('SELECT rating FROM ratings WHERE user_id = $1 AND movie_id = $2', [partnerId, r.movie_id]),
        ]);
        const ra = myR.rows[0]?.rating ?? null;
        const rb = pr.rows[0]?.rating ?? null;
        const avg = ra != null && rb != null ? (ra + rb) / 2 : (ra ?? rb);
        return {
          movie_id: r.movie_id,
          title: d?.title ?? '',
          release_date: d?.release_date ?? null,
          poster_path: d?.poster_path ? posterPath(base, d.poster_path, 'w500') : null,
          my_rating: ra,
          partner_rating: rb,
          average_rating: avg != null ? Math.round(avg * 10) / 10 : null,
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
    const body = z.object({ movie_id: z.number().int().positive() }).safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Некорректный movie_id', 'VALIDATION_ERROR');
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    await pool.query(
      'INSERT INTO watchlist (user_id, movie_id) VALUES ($1, $2) ON CONFLICT (user_id, movie_id) DO NOTHING',
      [userId, body.data.movie_id]
    );
    res.status(201).json({ message: 'Фильм добавлен в список' });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.delete('/me/:movieId', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId < 1) throw new AppError(400, 'Некорректный ID', 'VALIDATION_ERROR');
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    await pool.query('DELETE FROM ratings WHERE user_id = $1 AND movie_id = $2', [userId, movieId]);
    const del = await pool.query('DELETE FROM watchlist WHERE user_id = $1 AND movie_id = $2 RETURNING id', [userId, movieId]);
    if (del.rowCount === 0) throw new AppError(404, 'Фильм не найден в списке', 'NOT_FOUND');
    res.json({ message: 'Фильм удалён из списка' });
  } catch (e) {
    next(e);
  }
});

watchlistRouter.put('/me/:movieId/rate', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId) || movieId < 1) throw new AppError(400, 'Некорректный ID', 'VALIDATION_ERROR');
    const body = z.object({ rating: z.number().int().min(1).max(10) }).safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Оценка от 1 до 10', 'VALIDATION_ERROR');
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    const inList = await pool.query('SELECT id FROM watchlist WHERE user_id = $1 AND movie_id = $2', [userId, movieId]);
    if (inList.rows.length === 0) throw new AppError(400, 'Оценку можно поставить только фильму из своего списка', 'NOT_IN_WATCHLIST');
    await pool.query(
      'INSERT INTO ratings (user_id, movie_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = $3, updated_at = now()',
      [userId, movieId, body.data.rating]
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
    const userId = uid(req as unknown as Request & { user: JwtPayload });
    const pool = getPool();
    await pool.query('DELETE FROM ratings WHERE user_id = $1 AND movie_id = $2', [userId, movieId]);
    res.json({ message: 'Статус «Просмотрено» снят' });
  } catch (e) {
    next(e);
  }
});
