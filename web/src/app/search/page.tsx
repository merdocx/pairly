'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import type { MovieSearch } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PosterImage } from '@/components/PosterImage';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [data, setData] = useState<MovieSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<Array<{ movie_id: number; media_type: 'movie' | 'tv' }>>([]);

  useEffect(() => {
    api<{ items: { movie_id: number; media_type: 'movie' | 'tv' }[] }>('/api/watchlist/me')
      .then((res) => setWatchlistItems(res.items.map((i) => ({ movie_id: i.movie_id, media_type: i.media_type }))))
      .catch(() => {});
  }, []);

  const inWatchlist = (id: number, mediaType: 'movie' | 'tv') =>
    watchlistItems.some((i) => i.movie_id === id && i.media_type === mediaType);

  const search = useCallback(
    async (q: string, page: number = 1) => {
      if (!q.trim()) {
        setData({ page: 1, results: [], total_pages: 0, total_results: 0 });
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await api<MovieSearch>(
          `/api/movies/search?q=${encodeURIComponent(q.trim())}&page=${page}`
        );
        if (page === 1) setData(res);
        else setData((prev) => (prev ? { ...res, results: [...prev.results, ...res.results] } : res));
      } catch (e) {
        setError(getErrorMessage(e));
        if (e instanceof Error && (e.message.includes('401') || e.message.includes('token'))) router.replace('/login');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
    search(query, 1);
  };

  const loadMore = () => {
    if (!data || data.page >= data.total_pages || loading) return;
    search(submitted, data.page + 1);
  };

  async function addToWatchlist(movieId: number, mediaType: 'movie' | 'tv') {
    setAddingId(movieId);
    try {
      await api('/api/watchlist/me', {
        method: 'POST',
        body: JSON.stringify({ movie_id: movieId, media_type: mediaType }),
      });
      setWatchlistItems((prev) => [...prev, { movie_id: movieId, media_type: mediaType }]);
      alert(mediaType === 'tv' ? 'Сериал добавлен в «Буду смотреть»' : 'Фильм добавлен в «Буду смотреть»');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setAddingId(null);
    }
  }

  async function removeFromWatchlist(movieId: number, mediaType: 'movie' | 'tv') {
    setRemovingId(movieId);
    try {
      await api(`/api/watchlist/me/${movieId}?type=${mediaType}`, { method: 'DELETE' });
      setWatchlistItems((prev) => prev.filter((i) => !(i.movie_id === movieId && i.media_type === mediaType)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <AppLayout>
      <div className="container">
        <h1 className="page-title">Поиск фильмов и сериалов</h1>
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-bar-wrapper">
            <span className="search-bar-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск фильмов..."
              aria-label="Поиск"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-login-primary" style={{ maxWidth: 120 }}>
            {loading ? '…' : 'Искать'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {data && (
          <>
            {data.total_results > 0 && (
              <p className="section-desc" style={{ marginBottom: 12 }}>Найдено: {data.total_results}</p>
            )}
            {data.results.length === 0 && submitted && !loading && (
              <p className="empty-text">Ничего не найдено.</p>
            )}
            <ul className="film-grid">
              {data.results.map((m) => (
                <li key={`${m.media_type}-${m.id}`} className="film-card">
                  <Link href={m.media_type === 'tv' ? `/movie/${m.id}?type=tv` : `/movie/${m.id}`} style={{ display: 'block', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--border)' }}>
                    <PosterImage src={m.poster_path} width={240} height={360} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Link>
                  <div className="film-card-body">
                    <h3 className="film-card-title">
                      <Link href={m.media_type === 'tv' ? `/movie/${m.id}?type=tv` : `/movie/${m.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {m.title}
                      </Link>
                    </h3>
                    <p className="film-card-year">{m.release_date ? m.release_date.slice(0, 4) : '—'}</p>
                    <div className="film-card-actions">
                      {inWatchlist(m.id, m.media_type) ? (
                        <button type="button" onClick={() => removeFromWatchlist(m.id, m.media_type)} disabled={removingId === m.id} style={{ background: 'var(--error)', color: 'white', fontSize: 12, padding: '6px 10px' }}>
                          {removingId === m.id ? '…' : 'Удалить'}
                        </button>
                      ) : (
                        <button type="button" className="btn-add" onClick={() => addToWatchlist(m.id, m.media_type)} disabled={addingId === m.id}>
                          <span className="plus-icon" aria-hidden>+</span>
                          {addingId === m.id ? '…' : 'Добавить'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {data.results.length > 0 && data.page < data.total_pages && (
              <button type="button" onClick={loadMore} disabled={loading} className="load-more-btn">
                Загрузить ещё
              </button>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
