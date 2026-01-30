'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { api, getErrorMessage } from '@/lib/api';
import type { MovieSearch, WatchlistItem, MovieDetail } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { CheckIcon, CalendarIconSmall, ClockIconSmall } from '@/components/Icons';
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { PosterImage } from '@/components/PosterImage';
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating';
import { useToast } from '@/components/Toast';

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
  const [sortedResults, setSortedResults] = useState<MovieSearch['results']>([]);
  const rateModalAnim = useModalAnimation(!!rateModalItem, () => setRateModalItem(null));
  const detailModalAnim = useModalAnimation(!!(detailModalItem && detailMovie), () => setDetailModalItem(null));
  const { showToast } = useToast();
  const searchAbortRef = useRef<AbortController | null>(null);

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
      searchAbortRef.current?.abort();
      searchAbortRef.current = new AbortController();
      const signal = searchAbortRef.current.signal;
      setLoading(true);
      setError('');
      try {
        const res = await api<MovieSearch>(
          `/api/movies/search?q=${encodeURIComponent(q.trim())}&page=${page}`,
          { signal }
        );
        if (signal.aborted) return;
        if (page === 1) setData(res);
        else setData((prev) => (prev ? { ...res, results: [...prev.results, ...res.results] } : res));
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(getErrorMessage(e));
        if (e instanceof Error && (e.message.includes('401') || e.message.includes('token'))) router.replace('/login');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!query.trim()) {
      setData(null);
      setError('');
      setSortedResults([]);
      return;
    }
    const t = setTimeout(() => search(query.trim(), 1), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    if (!data?.results?.length) {
      setSortedResults([]);
      return;
    }
    setSortedResults(
      [...data.results].sort((a, b) => {
        const aIn = watchlistItems.some((i) => i.movie_id === a.id && i.media_type === a.media_type);
        const bIn = watchlistItems.some((i) => i.movie_id === b.id && i.media_type === b.media_type);
        return (bIn ? 1 : 0) - (aIn ? 1 : 0);
      })
    );
    // Сортировка только при новом поиске/подгрузке (data), не при изменении watchlistItems
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watchlistItems намеренно не в deps
  }, [data]);

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
      showToast(getErrorMessage(e));
    } finally {
      setAddingId(null);
    }
  }

  async function removeFromList(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}?type=${mediaType}`, { method: 'DELETE' });
      setWatchlistItems((prev) => prev.filter((i) => !(i.movie_id === movieId && i.media_type === mediaType)));
    } catch (e) {
      showToast(getErrorMessage(e));
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
      showToast(getErrorMessage(e));
    }
  }

  async function unwatch(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}/rate?type=${mediaType}`, { method: 'DELETE' });
      setWatchlistItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating: null, watched: false } : i))
      );
    } catch (e) {
      showToast(getErrorMessage(e));
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
              {sortedResults.length > 0 && (
                <ul className="film-grid">
                  {sortedResults.map((m) => {
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
              {sortedResults.length > 0 && data && data.page < data.total_pages && (
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
            <div
              className={`modal-overlay ${rateModalAnim.open ? 'modal-overlay--open' : ''} ${rateModalAnim.closing ? 'modal-overlay--closing' : ''}`}
              onClick={rateModalAnim.requestClose}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rate-movie-title"
            >
              <div className={`modal-card modal-rate ${rateModalAnim.open ? 'modal-card--open' : ''} ${rateModalAnim.closing ? 'modal-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
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
                  <button type="button" className="btn-rate-secondary" onClick={rateModalAnim.requestClose}>Отмена</button>
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
            <div
              className={`modal-overlay ${detailModalAnim.open ? 'modal-overlay--open' : ''} ${detailModalAnim.closing ? 'modal-overlay--closing' : ''}`}
              onClick={detailModalAnim.requestClose}
              role="dialog"
              aria-modal="true"
              aria-labelledby="detail-movie-title"
            >
              <div className={`modal-card modal-card-detail modal-card-detail-scroll ${detailModalAnim.open ? 'modal-card--open' : ''} ${detailModalAnim.closing ? 'modal-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="detail-modal-banner" style={{ backgroundImage: bannerImage ? `url(${bannerImage})` : undefined }}>
                  <button type="button" className="detail-modal-close" onClick={detailModalAnim.requestClose} aria-label="Закрыть">×</button>
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
                        <button type="button" className="btn-delete-from-list" onClick={() => { removeFromList(item.movie_id, item.media_type); detailModalAnim.requestClose(); }}>
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
                          className="btn-watched-gray btn-watched-modal"
                          onClick={async () => {
                            await addToWatchlist(addPayload);
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
