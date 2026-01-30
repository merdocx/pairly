import { Router } from 'express';
import {
  searchMovies,
  getMovieDetail,
  getTvDetail,
  getConfiguration,
  posterPath,
  type TmdbMovieDetail,
  type TmdbTvDetail,
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
      media_type: m.media_type,
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
  const type = String(req.query.type || 'movie').toLowerCase();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, 'Некорректный ID', 'VALIDATION_ERROR');
    }
    const config = await getConfiguration();
    const baseUrl = config.images.secure_base_url || config.images.base_url;
    if (type === 'tv') {
      const tv = await getTvDetail(id);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.json({
        id: tv.id,
        media_type: 'tv',
        title: tv.name,
        overview: tv.overview,
        release_date: tv.first_air_date,
        poster_path: posterPath(baseUrl, tv.poster_path, 'w780'),
        poster_path_thumb: posterPath(baseUrl, tv.poster_path, 'w300'),
        backdrop_path: posterPath(baseUrl, tv.backdrop_path ?? null, 'w780'),
        vote_average: tv.vote_average,
        genres: tv.genres,
        runtime: null,
        number_of_seasons: tv.number_of_seasons,
        number_of_episodes: tv.number_of_episodes,
      });
    }
    const movie = await getMovieDetail(id);
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      id: movie.id,
      media_type: 'movie',
      title: movie.title,
      overview: movie.overview,
      release_date: movie.release_date,
      poster_path: posterPath(baseUrl, movie.poster_path, 'w780'),
      poster_path_thumb: posterPath(baseUrl, movie.poster_path, 'w300'),
      backdrop_path: posterPath(baseUrl, movie.backdrop_path ?? null, 'w780'),
      vote_average: movie.vote_average,
      genres: movie.genres,
      runtime: movie.runtime,
    });
  } catch (e) {
    if (e instanceof AppError) return next(e);
    if (e instanceof Error && (e.message.includes('404') || e.message.includes('Не найден'))) {
      return next(new AppError(404, type === 'tv' ? 'Сериал не найден' : 'Фильм не найден', 'NOT_FOUND'));
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
