const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token = getToken(), ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Ошибка запроса');
  return data as T;
}

/** Понятное сообщение для пользователя (сеть, TMDB, прочее). */
export function getErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return 'Произошла ошибка';
  const m = e.message;
  if (/failed to fetch|network is not defined|networkerror/i.test(m)) return 'Проверьте подключение к интернету';
  return m;
}

export type User = { id: string; email: string; name: string };
export type Pair = { id: string; code: string; partner: { id: string; email: string; name: string } | null };
export type MovieSearch = { page: number; results: Array<{ id: number; title: string; overview: string | null; release_date: string | null; poster_path: string | null; vote_average: number }>; total_pages: number; total_results: number };
export type MovieDetail = { id: number; title: string; overview: string | null; release_date: string | null; poster_path: string | null; poster_path_thumb: string | null; vote_average: number; genres: Array<{ id: number; name: string }>; runtime: number | null };
export type WatchlistItem = { movie_id: number; added_at: string; rating: number | null; watched: boolean; title: string; release_date: string | null; poster_path: string | null };
export type IntersectionItem = WatchlistItem & { my_rating: number | null; partner_rating: number | null; average_rating: number | null };
