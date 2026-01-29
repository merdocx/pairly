const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const LANGUAGE = 'ru-RU';
const REGION = 'RU';

const CACHE_TTL_SEARCH = 3600;
const CACHE_TTL_MOVIE = 86400;
const CACHE_TTL_CONFIG = 604800;

import { cacheGet, cacheSet } from '../db/redis.js';

async function tmdbFetch<T>(path: string, cacheKey?: string, ttl?: number): Promise<T> {
  if (cacheKey && ttl) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) return cached;
  }
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=${LANGUAGE}&region=${REGION}`;
  const res = await fetch(url);
  if (res.status === 429) {
    throw new Error('Превышен лимит запросов. Попробуйте позже.');
  }
  if (!res.ok) {
    throw new Error(res.status === 504 ? 'Таймаут. Попробуйте позже.' : 'Ошибка при загрузке данных.');
  }
  const data = (await res.json()) as T;
  if (cacheKey && ttl) await cacheSet(cacheKey, data, ttl);
  return data;
}

export interface TmdbSearchResult {
  page: number;
  results: Array<{
    id: number;
    title: string;
    overview: string | null;
    release_date: string | null;
    poster_path: string | null;
    vote_average: number;
  }>;
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  runtime: number | null;
}

export interface TmdbConfiguration {
  images: { base_url: string; secure_base_url: string; poster_sizes: string[] };
}

export async function searchMovies(query: string, page: number): Promise<TmdbSearchResult> {
  const q = encodeURIComponent(query.trim());
  const cacheKey = `tmdb:search:${q}:${page}`;
  return tmdbFetch<TmdbSearchResult>(
    `/search/movie?query=${q}&page=${page}`,
    cacheKey,
    CACHE_TTL_SEARCH
  );
}

export async function getMovieDetail(movieId: number): Promise<TmdbMovieDetail> {
  const cacheKey = `tmdb:movie:${movieId}`;
  return tmdbFetch<TmdbMovieDetail>(`/movie/${movieId}`, cacheKey, CACHE_TTL_MOVIE);
}

export async function getConfiguration(): Promise<TmdbConfiguration> {
  const cacheKey = 'tmdb:configuration';
  return tmdbFetch<TmdbConfiguration>('/configuration', cacheKey, CACHE_TTL_CONFIG);
}

export function posterPath(baseUrl: string, path: string | null, size: 'w300' | 'w500' | 'w780'): string | null {
  if (!path) return null;
  return `${baseUrl}${size}${path}`;
}
