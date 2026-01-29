import { Router } from 'express';
import {
  searchMovies,
  getMovieDetail,
  getConfiguration,
  posterPath,
  type TmdbSearchResult,
  type TmdbMovieDetail,
  type TmdbConfiguration,
} from '../services/tmdb.js';
import { AppError } from '../middleware/errorHandler.js';

export const moviesRouter = Router();

moviesRouter.get('/search', async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    if (!query) {
      return res.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
    }
    const data = await searchMovies(query, page);
    const config = await getConfiguration();
    const baseUrl = config.images.secure_base_url || config.images.base_url;
    const results = data.results.map((m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      release_date: m.release_date,
      poster_path: posterPath(baseUrl, m.poster_path, 'w500'),
      vote_average: m.vote_average,
    }));
    res.json({
      page: data.page,
      results,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });
  } catch (e) {
    if (e instanceof Error) {
      const msg = e.message.includes('429')
        ? 'Слишком много запросов. Попробуйте через минуту.'
        : /timeout|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|network/i.test(e.message)
          ? 'Нет связи с сервисом фильмов. Проверьте интернет.'
          : 'Сервис поиска фильмов временно недоступен. Попробуйте позже.';
      return next(new AppError(502, msg, 'TMDB_ERROR'));
    }
    next(e);
  }
});

moviesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, 'Некорректный ID фильма', 'VALIDATION_ERROR');
    }
    const movie = await getMovieDetail(id);
    const config = await getConfiguration();
    const baseUrl = config.images.secure_base_url || config.images.base_url;
    res.json({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      release_date: movie.release_date,
      poster_path: posterPath(baseUrl, movie.poster_path, 'w780'),
      poster_path_thumb: posterPath(baseUrl, movie.poster_path, 'w300'),
      vote_average: movie.vote_average,
      genres: movie.genres,
      runtime: movie.runtime,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) {
      return next(new AppError(404, 'Фильм не найден', 'NOT_FOUND'));
    }
    if (e instanceof Error) {
      const msg = e.message.includes('429')
        ? 'Слишком много запросов. Попробуйте через минуту.'
        : /timeout|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|network/i.test(e.message)
          ? 'Нет связи с сервисом фильмов. Проверьте интернет.'
          : 'Сервис фильмов временно недоступен. Попробуйте позже.';
      return next(new AppError(502, msg, 'TMDB_ERROR'));
    }
    next(e);
  }
});

moviesRouter.get('/config/image', async (_req, res, next) => {
  try {
    const config = await getConfiguration();
    res.json({
      base_url: config.images.secure_base_url || config.images.base_url,
      poster_sizes: config.images.poster_sizes,
    });
  } catch (e) {
    if (e instanceof Error) {
      const msg = /timeout|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|network/i.test(e.message)
        ? 'Нет связи с сервисом. Проверьте интернет.'
        : 'Сервис временно недоступен. Попробуйте позже.';
      return next(new AppError(502, msg, 'TMDB_ERROR'));
    }
    next(e);
  }
});
