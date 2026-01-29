'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import type { MovieDetail } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PosterImage } from '@/components/PosterImage';

export default function MoviePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params?.id);
  const type = searchParams.get('type') || 'movie';
  const isTv = type === 'tv';
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [inWatchlist, setInWatchlist] = useState<boolean | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError('Некорректный ID');
      setLoading(false);
      return;
    }
    const typeParam = type === 'tv' ? '?type=tv' : '';
    Promise.all([
      api<MovieDetail>(`/api/movies/${id}${typeParam}`).catch((e) => {
        if (e instanceof Error && e.message.includes('не найден')) return null;
        throw e;
      }),
      isTv
        ? Promise.resolve(null)
        : api<{ items: { movie_id: number; rating: number | null }[] }>('/api/watchlist/me')
            .then((r) => {
              const item = r.items.find((i) => i.movie_id === id);
              setInWatchlist(!!item);
              setMyRating(item?.rating ?? null);
            })
            .catch(() => setInWatchlist(false)),
    ])
      .then(([m]) => {
        setMovie(m ?? null);
        if (isTv) setInWatchlist(false);
      })
      .catch((e) => {
        if (e instanceof Error && (e.message.includes('401') || e.message.includes('token')))
          router.replace('/login');
        else setError(getErrorMessage(e));
      })
      .finally(() => setLoading(false));
  }, [id, type, isTv, router]);

  async function addToWatchlist() {
    try {
      await api('/api/watchlist/me', {
        method: 'POST',
        body: JSON.stringify({ movie_id: id }),
      });
      setInWatchlist(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function removeFromWatchlist() {
    try {
      await api(`/api/watchlist/me/${id}`, { method: 'DELETE' });
      setInWatchlist(false);
      setMyRating(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function setRating(rating: number) {
    try {
      await api(`/api/watchlist/me/${id}/rate`, {
        method: 'PUT',
        body: JSON.stringify({ rating }),
      });
      setMyRating(rating);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function unwatch() {
    try {
      await api(`/api/watchlist/me/${id}/rate`, { method: 'DELETE' });
      setMyRating(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  if (loading) return <AppLayout><div className="container">Загрузка...</div></AppLayout>;
  if (error || !movie) {
    return (
      <AppLayout>
        <div className="container">
          <p style={{ color: 'var(--error)' }}>{error || (isTv ? 'Сериал не найден' : 'Фильм не найден')}</p>
          <Link href="/search">К поиску</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container">
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <PosterImage
            src={movie.poster_path_thumb || movie.poster_path || null}
            width={200}
            height={300}
            style={{ borderRadius: 8 }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ marginTop: 0 }}>
            {movie.media_type === 'tv' && <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginRight: 8 }}>Сериал</span>}
            {movie.title}
            {movie.release_date && (
              <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '1rem' }}>
                {' '}({movie.release_date.slice(0, 4)})
              </span>
            )}
          </h1>
          {movie.vote_average > 0 && (
            <p style={{ color: 'var(--muted)' }}>Рейтинг TMDB: {movie.vote_average}</p>
          )}
          {movie.genres?.length > 0 && (
            <p style={{ color: 'var(--muted)' }}>{movie.genres.map((g) => g.name).join(', ')}</p>
          )}
          {movie.media_type === 'tv' && (movie.number_of_seasons != null || movie.number_of_episodes != null) && (
            <p style={{ color: 'var(--muted)' }}>
              {movie.number_of_seasons != null && `${movie.number_of_seasons} сезонов`}
              {movie.number_of_seasons != null && movie.number_of_episodes != null && ' · '}
              {movie.number_of_episodes != null && `${movie.number_of_episodes} эп.`}
            </p>
          )}
          {movie.media_type !== 'tv' && movie.runtime != null && movie.runtime > 0 && (
            <p style={{ color: 'var(--muted)' }}>{movie.runtime} мин</p>
          )}
          {movie.overview && (
            <p style={{ marginTop: '1rem', lineHeight: 1.5 }}>{movie.overview}</p>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {movie.media_type !== 'tv' && inWatchlist === false && (
              <button type="button" onClick={addToWatchlist}>
                Добавить в «Буду смотреть»
              </button>
            )}
            {movie.media_type === 'tv' && (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Сериалы пока нельзя добавить в список.</p>
            )}
            {movie.media_type !== 'tv' && inWatchlist && (
              <>
                <button
                  type="button"
                  onClick={removeFromWatchlist}
                  style={{ background: 'var(--error)' }}
                >
                  Удалить из списка
                </button>
                <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>Оценка:</span>
                <select
                  value={myRating ?? ''}
                  onChange={(e) => setRating(Number(e.target.value))}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>★ {n}</option>
                  ))}
                </select>
                {myRating != null && (
                  <button type="button" onClick={unwatch} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                    Снять «Просмотрено»
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
