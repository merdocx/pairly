'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { api, getErrorMessage } from '@/lib/api';
import type { MovieSearch, WatchlistItem, MovieDetail } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PosterImage } from '@/components/PosterImage';
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating';

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CalendarIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [data, setData] = useState<MovieSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [rateModalItem, setRateModalItem] = useState<{ movieId: number; mediaType: 'movie' | 'tv'; title: string } | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<{ movieId: number; mediaType: 'movie' | 'tv' } | null>(null);
  const [detailMovie, setDetailMovie] = useState<MovieDetail | null>(null);

  useEffect(() => {
    api<{ items: WatchlistItem[] }>('/api/watchlist/me')
      .then((r) => setWatchlistItems(r.items))
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!detailModalItem) {
      setDetailMovie(null);
      return;
    }
    const typeParam = detailModalItem.mediaType === 'tv' ? '?type=tv' : '';
    api<MovieDetail>(`/api/movies/${detailModalItem.movieId}${typeParam}`)
      .then(setDetailMovie)
      .catch(() => setDetailMovie(null));
  }, [detailModalItem]);

  useEffect(() => {
    if (detailModalItem && typeof document !== 'undefined') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [detailModalItem]);

  const inWatchlist = (id: number, mediaType: 'movie' | 'tv') =>
    watchlistItems.some((i) => i.movie_id === id && i.media_type === mediaType);

  const getWatchlistItem = (id: number, mediaType: 'movie' | 'tv') =>
    watchlistItems.find((i) => i.movie_id === id && i.media_type === mediaType) ?? null;

  const search = useCallback(
    async (q: string, page: number = 1) => {
      if (!q.trim()) {
        setData(null);
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

  useEffect(() => {
    if (!query.trim()) {
      setData(null);
      setError('');
      return;
    }
    const t = setTimeout(() => search(query.trim(), 1), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  const loadMore = () => {
    if (!data || data.page >= data.total_pages || loading || !query.trim()) return;
    search(query.trim(), data.page + 1);
  };

  async function addToWatchlist(m: { id: number; media_type: 'movie' | 'tv'; title: string; release_date: string | null; poster_path: string | null }) {
    setAddingId(m.id);
    try {
      await api('/api/watchlist/me', {
        method: 'POST',
        body: JSON.stringify({ movie_id: m.id, media_type: m.media_type }),
      });
      setWatchlistItems((prev) => [...prev, { movie_id: m.id, media_type: m.media_type, added_at: '', rating: null, watched: false, title: m.title, release_date: m.release_date, poster_path: m.poster_path }]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setAddingId(null);
    }
  }

  async function removeFromList(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}?type=${mediaType}`, { method: 'DELETE' });
      setWatchlistItems((prev) => prev.filter((i) => !(i.movie_id === movieId && i.media_type === mediaType)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function setRating(movieId: number, mediaType: 'movie' | 'tv', rating: number) {
    try {
      await api(`/api/watchlist/me/${movieId}/rate?type=${mediaType}`, {
        method: 'PUT',
        body: JSON.stringify({ rating }),
      });
      setWatchlistItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating, watched: true } : i))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function unwatch(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}/rate?type=${mediaType}`, { method: 'DELETE' });
      setWatchlistItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating: null, watched: false } : i))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppLayout className="layout-home layout-search">
      <div className="container home-page">
        <div className="home-page-sticky">
          <div className="search-bar-full">
            <span className="search-bar-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск фильмов..."
              aria-label="Поиск"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="home-page-scroll">
          {error && <p className="error-text">{error}</p>}
          {data && (
            <>
              {data.total_results > 0 && (
                <p className="section-desc" style={{ marginBottom: 12 }}>Найдено: {data.total_results}</p>
              )}
              {data.results.length === 0 && query.trim() && !loading && (
                <p className="empty-text">Ничего не найдено.</p>
              )}
              {data.results.length > 0 && (
                <ul className="film-grid">
                  {[...data.results]
                    .sort((a, b) => {
                      const aIn = inWatchlist(a.id, a.media_type);
                      const bIn = inWatchlist(b.id, b.media_type);
                      return (bIn ? 1 : 0) - (aIn ? 1 : 0);
                    })
                    .map((m) => {
                    const item = getWatchlistItem(m.id, m.media_type);
                    const inList = !!item;
                    return (
                      <li key={`${m.media_type}-${m.id}`} className="film-card" style={{ opacity: inList && item?.watched ? 0.9 : 1 }}>
                        <button
                          type="button"
                          className="film-card-poster-btn"
                          onClick={() => setDetailModalItem({ movieId: m.id, mediaType: m.media_type })}
                          style={{ display: 'block', width: '100%', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--border)', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          <PosterImage src={m.poster_path} width={200} height={300} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                        <div className="film-card-body film-card-body-grid">
                          <h3 className="film-card-title">
                            <button
                              type="button"
                              className="film-card-title-btn"
                              onClick={() => setDetailModalItem({ movieId: m.id, mediaType: m.media_type })}
                              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', textDecoration: 'none' }}
                            >
                              {m.title}
                            </button>
                          </h3>
                          <p className="film-card-year">{m.release_date ? m.release_date.slice(0, 4) : '—'}</p>
                          <div className="film-card-rating-slot">
                            <StarRatingDisplay value={item?.rating ?? 0} />
                          </div>
                          <div className="film-card-actions">
                            {inList && item ? (
                              <>
                                {item.watched ? (
                                  <button
                                    type="button"
                                    className="btn-watched btn-watched-card"
                                    onClick={() => unwatch(item.movie_id, item.media_type)}
                                  >
                                    <CheckIcon size={14} />
                                    Просмотрено
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-watched-gray btn-watched-card"
                                    onClick={() => setRateModalItem({ movieId: item.movie_id, mediaType: item.media_type, title: item.title || m.title })}
                                  >
                                    Не просмотрено
                                  </button>
                                )}
                                <button type="button" className="btn-delete-card" onClick={() => removeFromList(item.movie_id, item.media_type)}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                  Удалить
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn-watched-gray btn-watched-card"
                                  onClick={async () => {
                                    await addToWatchlist(m);
                                    setRateModalItem({ movieId: m.id, mediaType: m.media_type, title: m.title });
                                  }}
                                  disabled={addingId === m.id}
                                >
                                  Не просмотрено
                                </button>
                                <button
                                  type="button"
                                  className="btn-add btn-watched-card"
                                  onClick={() => addToWatchlist(m)}
                                  disabled={addingId === m.id}
                                >
                                  <span className="plus-icon" aria-hidden>+</span>
                                  {addingId === m.id ? '…' : 'Добавить'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {data.results.length > 0 && data.page < data.total_pages && (
                <button type="button" onClick={loadMore} disabled={loading} className="load-more-btn">
                  Загрузить ещё
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {rateModalItem && typeof document !== 'undefined' && createPortal(
        (() => {
          const currentItem = watchlistItems.find((i) => i.movie_id === rateModalItem.movieId && i.media_type === rateModalItem.mediaType);
          const currentRating = currentItem?.rating ?? null;
          const displayStars = currentRating != null ? Math.round(currentRating / 2) : 0;
          return (
            <div className="modal-overlay" onClick={() => setRateModalItem(null)} role="dialog" aria-modal="true" aria-labelledby="rate-movie-title">
              <div className="modal-card modal-rate" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="modal-close-x" onClick={() => setRateModalItem(null)} aria-label="Закрыть">×</button>
                <h2 id="rate-movie-title" className="modal-rate-title">Оценить фильм</h2>
                <p className="modal-rate-question">Как бы вы оценили «{rateModalItem.title}»?</p>
                <div className="modal-rate-stars">
                  <StarRatingInput
                    value={currentRating}
                    onChange={async (ratingValue) => {
                      await setRating(rateModalItem.movieId, rateModalItem.mediaType, ratingValue);
                      setRateModalItem(null);
                    }}
                  />
                </div>
                <p className="modal-rate-hint" aria-live="polite">
                  {displayStars > 0 ? `${displayStars} из 5` : 'Выберите оценку'}
                </p>
                <div className="modal-rate-actions">
                  <button type="button" className="btn-rate-secondary" onClick={() => setRateModalItem(null)}>Отмена</button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {detailModalItem && detailMovie && typeof document !== 'undefined' && createPortal(
        (() => {
          const item = watchlistItems.find((i) => i.movie_id === detailModalItem.movieId && i.media_type === detailModalItem.mediaType);
          const inList = !!item;
          const runtimeStr = detailMovie.media_type !== 'tv' && detailMovie.runtime != null && detailMovie.runtime > 0
            ? detailMovie.runtime >= 60 ? `${Math.floor(detailMovie.runtime / 60)} ч ${detailMovie.runtime % 60} мин` : `${detailMovie.runtime} мин`
            : null;
          const bannerImage = detailMovie.backdrop_path || detailMovie.poster_path || detailMovie.poster_path_thumb;
          const searchResult = data?.results?.find((r) => r.id === detailModalItem.movieId && r.media_type === detailModalItem.mediaType);
          const addPayload = searchResult || { id: detailMovie.id, media_type: (detailMovie.media_type || 'movie') as 'movie' | 'tv', title: detailMovie.title, release_date: detailMovie.release_date, poster_path: detailMovie.poster_path || detailMovie.poster_path_thumb };
          return (
            <div className="modal-overlay" onClick={() => setDetailModalItem(null)} role="dialog" aria-modal="true" aria-labelledby="detail-movie-title">
              <div className="modal-card modal-card-detail modal-card-detail-scroll" onClick={(e) => e.stopPropagation()}>
                <div className="detail-modal-banner" style={{ backgroundImage: bannerImage ? `url(${bannerImage})` : undefined }}>
                  <button type="button" className="detail-modal-close" onClick={() => setDetailModalItem(null)} aria-label="Закрыть">×</button>
                  {inList && item?.watched && <span className="detail-modal-watched-icon" aria-hidden><CheckIcon size={18} /></span>}
                  <div className="detail-modal-banner-content">
                    <h2 id="detail-movie-title" className="detail-modal-title">
                      {detailMovie.media_type === 'tv' && <span className="detail-modal-label">Сериал</span>}
                      {detailMovie.title}
                    </h2>
                    <div className="detail-modal-meta">
                      {detailMovie.release_date && <span className="detail-modal-meta-item"><CalendarIconSmall />{detailMovie.release_date.slice(0, 4)}</span>}
                      {runtimeStr && <span className="detail-modal-meta-item"><ClockIconSmall />{runtimeStr}</span>}
                    </div>
                  </div>
                </div>
                <div className="detail-modal-body">
                  <section className="detail-modal-section">
                    <h3 className="detail-modal-section-title">Ваша оценка</h3>
                    <div className="detail-modal-rating-row">
                      <StarRatingDisplay value={inList && item?.watched && item.rating != null ? item.rating : 0} />
                      {inList && item?.watched && item.rating != null && <span className="detail-modal-rating-text">{Math.round(item.rating / 2)}/5</span>}
                    </div>
                  </section>
                  <dl className="detail-modal-dl">
                    <dt>Режиссёр:</dt>
                    <dd>Не указан</dd>
                    <dt>Жанр:</dt>
                    <dd>{detailMovie.genres?.length ? detailMovie.genres.map((g) => g.name).join(', ') : '—'}</dd>
                  </dl>
                  {detailMovie.overview && (
                    <section className="detail-modal-section">
                      <h3 className="detail-modal-section-title">Описание</h3>
                      <p className="detail-modal-overview">{detailMovie.overview}</p>
                    </section>
                  )}
                  {inList && <span className="tag-added tag-added-modal">Добавлено вами</span>}
                  <div className="detail-modal-actions">
                    {inList && item ? (
                      <>
                        {item.watched ? (
                          <button type="button" className="btn-watched btn-watched-modal" onClick={() => unwatch(item.movie_id, item.media_type)}>
                            <CheckIcon size={18} /> Просмотрено
                          </button>
                        ) : (
                          <button type="button" className="btn-watched-gray btn-watched-modal" onClick={() => setRateModalItem({ movieId: item.movie_id, mediaType: item.media_type, title: item.title })}>
                            Не просмотрено
                          </button>
                        )}
                        <button type="button" className="btn-delete-from-list" onClick={() => { removeFromList(item.movie_id, item.media_type); setDetailModalItem(null); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          Удалить из списка
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-watched-gray btn-watched-modal"
                          onClick={async () => {
                            await addToWatchlist(addPayload);
                            setDetailModalItem(null);
                            setRateModalItem({ movieId: detailModalItem.movieId, mediaType: detailModalItem.mediaType, title: detailMovie.title });
                          }}
                          disabled={addingId === detailModalItem.movieId}
                        >
                          Не просмотрено
                        </button>
                        <button
                          type="button"
                          className="btn-add btn-watched-modal"
                          onClick={async () => {
                            await addToWatchlist(addPayload);
                            setDetailModalItem(null);
                          }}
                          disabled={addingId === detailModalItem.movieId}
                        >
                          <span className="plus-icon" aria-hidden>+</span>
                          {addingId === detailModalItem.movieId ? '…' : 'Добавить'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </AppLayout>
  );
}
