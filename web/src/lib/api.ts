function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}
const API_URL = getApiUrl();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

const API_TIMEOUT_MS = 15000;

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token = getToken(), signal: userSignal, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const base = typeof window !== 'undefined' ? getApiUrl() : API_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  if (userSignal) {
    userSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...rest,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  let data: Record<string, unknown>;
  try {
    const text = await res.text();
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    if (!res.ok) throw new Error(res.statusText || 'Ошибка запроса');
    throw new Error('Некорректный ответ сервера');
  }
  if (!res.ok) throw new Error((data.error as string) || res.statusText || 'Ошибка запроса');
  return data as T;
}

/** Понятное сообщение для пользователя (сеть, TMDB, прочее). */
export function getErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return 'Произошла ошибка';
  const m = e.message;
  if (/failed to fetch|network is not defined|networkerror/i.test(m)) return 'Проверьте подключение к интернету';
  if (e.name === 'AbortError' || /abort/i.test(m)) return 'Сервер не отвечает. Попробуйте позже.';
  return m;
}

export type User = { id: string; email: string; name: string };
export type Pair = { id: string; code: string; partner: { id: string; email: string; name: string } | null };
export type MovieSearch = { page: number; results: Array<{ id: number; media_type: 'movie' | 'tv'; title: string; overview: string | null; release_date: string | null; poster_path: string | null; vote_average: number }>; total_pages: number; total_results: number };
export type MovieDetail = { id: number; media_type?: 'movie' | 'tv'; title: string; overview: string | null; release_date: string | null; poster_path: string | null; poster_path_thumb: string | null; backdrop_path?: string | null; vote_average: number; genres: Array<{ id: number; name: string }>; runtime: number | null; number_of_seasons?: number; number_of_episodes?: number };
export type WatchlistItem = { movie_id: number; media_type: 'movie' | 'tv'; added_at: string; rating: number | null; watched: boolean; partner_rating?: number | null; title: string; release_date: string | null; poster_path: string | null; genre?: string | null; runtime?: number | null };
export type IntersectionItem = WatchlistItem & { my_rating: number | null; partner_rating: number | null; average_rating: number | null };
