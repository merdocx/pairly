'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import type { MovieDetail } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PosterImage } from '@/components/PosterImage';
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating';

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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
  const [rateModalOpen, setRateModalOpen] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError('Некорректный ID');
      setLoading(false);
      return;
    }
    const typeParam = type === 'tv' ? '?type=tv' : '';
    const mediaType = isTv ? 'tv' : 'movie';
    Promise.all([
      api<MovieDetail>(`/api/movies/${id}${typeParam}`).catch((e) => {
        if (e instanceof Error && e.message.includes('не найден')) return null;
        throw e;
      }),
      api<{ items: { movie_id: number; media_type: string; rating: number | null }[] }>('/api/watchlist/me')
        .then((r) => {
          const item = r.items.find((i) => i.movie_id === id && i.media_type === mediaType);
          setInWatchlist(!!item);
          setMyRating(item?.rating ?? null);
        })
        .catch(() => setInWatchlist(false)),
    ])
      .then(([m]) => {
        setMovie(m ?? null);
      })
      .catch((e) => {
        if (e instanceof Error && (e.message.includes('401') || e.message.includes('token')))
          router.replace('/login');
        else setError(getErrorMessage(e));
      })
      .finally(() => setLoading(false));
  }, [id, type, isTv, router]);

  const mediaType = isTv ? 'tv' : 'movie';

  async function addToWatchlist() {
    try {
      await api('/api/watchlist/me', {
        method: 'POST',
        body: JSON.stringify({ movie_id: id, media_type: mediaType }),
      });
      setInWatchlist(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function removeFromWatchlist() {
    try {
      await api(`/api/watchlist/me/${id}?type=${mediaType}`, { method: 'DELETE' });
      setInWatchlist(false);
      setMyRating(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function setRating(rating: number) {
    try {
      await api(`/api/watchlist/me/${id}/rate?type=${mediaType}`, {
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
      await api(`/api/watchlist/me/${id}/rate?type=${mediaType}`, { method: 'DELETE' });
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

  const runtimeStr = movie.media_type !== 'tv' && movie.runtime != null && movie.runtime > 0
    ? movie.runtime >= 60 ? `${Math.floor(movie.runtime / 60)} ч ${movie.runtime % 60} мин` : `${movie.runtime} мин`
    : null;
  const displayRating = myRating != null ? Math.round(myRating / 2) : 0;

  return (
    <AppLayout>
      <div className="container" style={{ position: 'relative' }}>
        <Link
          href="/search"
          className="btn-close-modal"
          aria-label="Закрыть"
          style={{ position: 'absolute', top: 12, left: 16, zIndex: 2 }}
        >
          ×
        </Link>
        {inWatchlist && (
          <span className="icon-watchlist-status" style={{ position: 'absolute', top: 12, right: 16, zIndex: 2 }} aria-hidden>
            <CheckIcon />
          </span>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <PosterImage
              src={movie.poster_path_thumb || movie.poster_path || null}
              width={200}
              height={300}
              style={{ borderRadius: 8 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ marginTop: 0, marginBottom: 8 }}>
              {movie.media_type === 'tv' && <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginRight: 8 }}>Сериал</span>}
              {movie.title}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>
              {movie.release_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CalendarIcon />
                  {movie.release_date.slice(0, 4)}
                </span>
              )}
              {runtimeStr && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ClockIcon />
                  {runtimeStr}
                </span>
              )}
            </div>
            {movie.genres?.length > 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 12px' }}>{movie.genres.map((g) => g.name).join(', ')}</p>
            )}

            {inWatchlist && (
              <>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>Ваша оценка</p>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarRatingDisplay value={myRating} />
                  {myRating != null && <span style={{ fontSize: 14, color: 'var(--muted)' }}>{displayRating}/5</span>}
                  <button type="button" onClick={() => setRateModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, padding: 0, cursor: 'pointer' }}>
                    Изменить
                  </button>
                </div>
              </>
            )}

            {movie.overview && (
              <p style={{ marginTop: 0, lineHeight: 1.5, fontSize: 14 }}>{movie.overview}</p>
            )}

            {inWatchlist && <span className="tag-added" style={{ marginTop: 8, display: 'inline-block' }}>Добавлено вами</span>}

            <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {inWatchlist === false && (
                <button type="button" onClick={addToWatchlist} className="btn-add">
                  <span className="plus-icon">+</span>
                  Добавить в «Буду смотреть»
                </button>
              )}
              {inWatchlist && (
                <>
                  {myRating != null ? (
                    <button type="button" className="btn-watched" onClick={() => setRateModalOpen(true)}>
                      <CheckIcon />
                      Просмотрено
                    </button>
                  ) : (
                    <button type="button" className="btn-mark-watched" onClick={() => setRateModalOpen(true)}>
                      <span className="check-icon"><CheckIcon /></span>
                      Отметить просмотренным
                    </button>
                  )}
                  <button type="button" className="btn-delete" onClick={removeFromWatchlist}>
                    Удалить
                  </button>
                  {myRating != null && (
                    <button type="button" onClick={unwatch} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                      Снять «Просмотрено»
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {rateModalOpen && (
        <div className="modal-overlay" onClick={() => setRateModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="rate-movie-title">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-x" onClick={() => setRateModalOpen(false)} aria-label="Закрыть">
              ×
            </button>
            <h2 id="rate-movie-title">Оценить {movie.media_type === 'tv' ? 'сериал' : 'фильм'}</h2>
            <p className="section-desc" style={{ marginBottom: 16 }}>
              Как вы оцениваете «{movie.title}»?
            </p>
            <div style={{ marginBottom: 8 }}>
              <StarRatingInput
                value={myRating}
                onChange={async (v) => {
                  await setRating(v);
                  setRateModalOpen(false);
                }}
              />
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              {displayRating > 0 ? `${displayRating} из 5` : 'Выберите оценку'}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  unwatch();
                  setRateModalOpen(false);
                }}
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                Удалить оценку
              </button>
              <button type="button" onClick={() => setRateModalOpen(false)} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
