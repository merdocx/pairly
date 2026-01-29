'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import type { MovieDetail } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function MoviePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);
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
    Promise.all([
      api<MovieDetail>(`/api/movies/${id}`).catch((e) => {
        if (e instanceof Error && e.message.includes('не найден')) return null;
        throw e;
      }),
      api<{ items: { movie_id: number; rating: number | null }[] }>('/api/watchlist/me')
        .then((r) => {
          const item = r.items.find((i) => i.movie_id === id);
          setInWatchlist(!!item);
          setMyRating(item?.rating ?? null);
        })
        .catch(() => setInWatchlist(false)),
    ])
      .then(([m]) => setMovie(m ?? null))
      .catch((e) => {
        if (e instanceof Error && (e.message.includes('401') || e.message.includes('token')))
          router.replace('/login');
        else setError(getErrorMessage(e));
      })
      .finally(() => setLoading(false));
  }, [id, router]);

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
          <p style={{ color: 'var(--error)' }}>{error || 'Фильм не найден'}</p>
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
          {movie.poster_path_thumb || movie.poster_path ? (
            <img
              src={movie.poster_path_thumb || movie.poster_path || ''}
              alt=""
              width={200}
              height={300}
              style={{ objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 300,
                background: 'var(--surface)',
                borderRadius: 8,
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ marginTop: 0 }}>
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
          {movie.runtime != null && movie.runtime > 0 && (
            <p style={{ color: 'var(--muted)' }}>{movie.runtime} мин</p>
          )}
          {movie.overview && (
            <p style={{ marginTop: '1rem', lineHeight: 1.5 }}>{movie.overview}</p>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {inWatchlist === false && (
              <button type="button" onClick={addToWatchlist}>
                Добавить в «Буду смотреть»
              </button>
            )}
            {inWatchlist && (
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
