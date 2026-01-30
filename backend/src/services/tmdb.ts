const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || '';
const LANGUAGE = 'ru-RU';
const REGION = 'RU';

const CACHE_TTL_SEARCH = 21600; // 6 часов
const CACHE_TTL_MOVIE = 604800; // 7 дней
const CACHE_TTL_CONFIG = 604800; // 7 дней

import { getMovieCache, setMovieCache } from '../db/movieCache.js';
import { cacheGet, cacheSet } from '../db/redis.js';

async function tmdbFetch<T>(
  path: string,
  cacheKey?: string,
  ttl?: number,
  opts?: { noRegion?: boolean }
): Promise<T> {
  if (cacheKey && ttl) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) return cached;
  }
  const params = `api_key=${TMDB_KEY}&language=${LANGUAGE}${opts?.noRegion ? '' : `&region=${REGION}`}`;
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}${params}`;
  const headers: HeadersInit = {};
  if (TMDB_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${TMDB_ACCESS_TOKEN}`;
  const res = await fetch(url, { headers });
  if (res.status === 429) {
    throw new Error('Превышен лимит запросов. Попробуйте позже.');
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('Не найден');
    if (res.status === 504) throw new Error('Таймаут. Попробуйте позже.');
    throw new Error('Ошибка при загрузке данных.');
  }
  const data = (await res.json()) as T;
  if (cacheKey && ttl) await cacheSet(cacheKey, data, ttl);
  return data;
}

export interface TmdbSearchResult {
  page: number;
  results: Array<{
    id: number;
    media_type: 'movie' | 'tv';
    title: string;
    overview: string | null;
    release_date: string | null;
    poster_path: string | null;
    vote_average: number;
  }>;
  total_pages: number;
  total_results: number;
}

/** Сырой ответ multi search (movie + tv + person) */
interface TmdbMultiResultItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  overview?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  poster_path?: string | null;
  vote_average?: number;
  profile_path?: string | null;
}

export interface TmdbMovieDetail {
  id: number;
  media_type?: 'movie';
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  runtime: number | null;
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  overview: string | null;
  first_air_date: string | null;
  poster_path: string | null;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  number_of_episodes?: number;
  number_of_seasons?: number;
}

export interface TmdbConfiguration {
  images: { base_url: string; secure_base_url: string; poster_sizes: string[] };
}

/** Поиск по полной базе: фильмы и сериалы (без фильтра по региону — максимум результатов) */
export async function searchMovies(query: string, page: number): Promise<TmdbSearchResult> {
  const q = encodeURIComponent(query.trim());
  const cacheKey = `tmdb:search_multi:${q}:${page}`;
  const path = `/search/multi?query=${q}&page=${page}`;
  const raw = await tmdbFetch<{ page: number; results: TmdbMultiResultItem[]; total_pages: number; total_results: number }>(
    path,
    cacheKey,
    CACHE_TTL_SEARCH,
    { noRegion: true }
  );
  const results = raw.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => ({
      id: r.id,
      media_type: r.media_type as 'movie' | 'tv',
      title: r.title ?? r.name ?? '',
      overview: r.overview ?? null,
      release_date: (r.release_date ?? r.first_air_date) ?? null,
      poster_path: r.poster_path ?? null,
      vote_average: r.vote_average ?? 0,
    }));
  return {
    page: raw.page,
    results,
    total_pages: raw.total_pages,
    total_results: raw.total_results,
  };
}

export async function getMovieDetail(movieId: number): Promise<TmdbMovieDetail> {
  const fromDb = await getMovieCache<TmdbMovieDetail>(movieId, 'movie');
  if (fromDb) return fromDb;
  const cacheKey = `tmdb:movie:${movieId}`;
  const data = await tmdbFetch<TmdbMovieDetail>(`/movie/${movieId}`, cacheKey, CACHE_TTL_MOVIE);
  await setMovieCache(movieId, 'movie', data).catch(() => {});
  return data;
}

export async function getTvDetail(tvId: number): Promise<TmdbTvDetail> {
  const fromDb = await getMovieCache<TmdbTvDetail>(tvId, 'tv');
  if (fromDb) return fromDb;
  const cacheKey = `tmdb:tv:${tvId}`;
  const data = await tmdbFetch<TmdbTvDetail>(`/tv/${tvId}`, cacheKey, CACHE_TTL_MOVIE);
  await setMovieCache(tvId, 'tv', data).catch(() => {});
  return data;
}

export async function getConfiguration(): Promise<TmdbConfiguration> {
  const cacheKey = 'tmdb:configuration';
  return tmdbFetch<TmdbConfiguration>('/configuration', cacheKey, CACHE_TTL_CONFIG);
}

export function posterPath(baseUrl: string, path: string | null, size: 'w300' | 'w500' | 'w780'): string | null {
  if (!path || !baseUrl?.trim()) return null;
  return `${baseUrl}${size}${path}`;
}
