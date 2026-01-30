'use client';

import { useEffect, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import type { WatchlistItem, IntersectionItem, MovieDetail } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { CheckIcon, CalendarIconSmall, ClockIconSmall } from '@/components/Icons';
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { PosterImage } from '@/components/PosterImage';
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating';
import { useToast } from '@/components/Toast';

type FilmsTab = 'me' | 'partner' | 'intersections';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as FilmsTab) || 'me';
  const { showToast } = useToast();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthed(false);
      return;
    }
    api('/api/auth/me')
      .then(() => setAuthed(true))
      .catch((e) => {
        showToast(getErrorMessage(e));
        localStorage.removeItem('token');
        setAuthed(false);
      });
  }, [showToast]);

  useEffect(() => {
    if (authed === false) {
      router.replace('/login');
    }
  }, [authed, router]);

  if (authed === null) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        Загрузка…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        Загрузка…
      </div>
    );
  }

  return (
    <AppLayout className="layout-home">
      <div className="container home-page">
        <div className="home-page-sticky">
          <div className="films-tabs" role="tablist">
            <Link href="/?tab=me" className={tab === 'me' ? 'active' : ''} role="tab">Моё</Link>
            <Link href="/?tab=partner" className={tab === 'partner' ? 'active' : ''} role="tab">Партнёра</Link>
            <Link href="/?tab=intersections" className={tab === 'intersections' ? 'active' : ''} role="tab">Общие</Link>
          </div>
        </div>
        <div className="home-page-scroll">
          <div style={{ display: tab === 'me' ? 'block' : 'none' }}><MyList /></div>
          <div style={{ display: tab === 'partner' ? 'block' : 'none' }}><PartnerList /></div>
          <div style={{ display: tab === 'intersections' ? 'block' : 'none' }}><IntersectionsList /></div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>Загрузка…</div>}>
      <HomePageContent />
    </Suspense>
  );
}

function MyList() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rateModalItem, setRateModalItem] = useState<{ movieId: number; mediaType: 'movie' | 'tv'; title: string } | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<{ movieId: number; mediaType: 'movie' | 'tv' } | null>(null);
  const [detailMovie, setDetailMovie] = useState<MovieDetail | null>(null);
  const rateModalAnim = useModalAnimation(!!rateModalItem, () => setRateModalItem(null));
  const detailModalAnim = useModalAnimation(!!(detailModalItem && detailMovie), () => setDetailModalItem(null));

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

  useEffect(() => {
    api<{ items: WatchlistItem[] }>('/api/watchlist/me')
      .then((r) => setItems(r.items))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const { showToast } = useToast();

  async function removeFromList(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}?type=${mediaType}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => !(i.movie_id === movieId && i.media_type === mediaType)));
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
      setItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating, watched: true } : i))
      );
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  }

  async function unwatch(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}/rate?type=${mediaType}`, { method: 'DELETE' });
      setItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating: null, watched: false } : i))
      );
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  }

  if (loading) return <p className="loading-text">Загрузка…</p>;

  return (
    <>
      {items.length === 0 ? (
        <p className="empty-text">В вашем списке пока нет фильмов</p>
      ) : (
        <ul className="film-grid">
          {items.map((item) => (
            <li key={`${item.media_type}-${item.movie_id}`} className="film-card" style={{ opacity: item.watched ? 0.9 : 1 }}>
              <button
                type="button"
                className="film-card-poster-btn"
                onClick={() => setDetailModalItem({ movieId: item.movie_id, mediaType: item.media_type })}
                style={{ display: 'block', width: '100%', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--border)', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <PosterImage src={item.poster_path} width={200} height={300} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
              <div className="film-card-body film-card-body-grid">
                <h3 className="film-card-title">
                  <button
                    type="button"
                    className="film-card-title-btn"
                    onClick={() => setDetailModalItem({ movieId: item.movie_id, mediaType: item.media_type })}
                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', textDecoration: 'none' }}
                  >
                    {item.title}
                  </button>
                </h3>
                <p className="film-card-year">{item.release_date ? String(item.release_date).slice(0, 4) : '—'}</p>
                <div className="film-card-rating-slot">
                  <StarRatingDisplay value={item.rating ?? 0} />
                </div>
                <div className="film-card-actions">
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
                      onClick={() => setRateModalItem({ movieId: item.movie_id, mediaType: item.media_type, title: item.title })}
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
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rateModalItem && typeof document !== 'undefined' && createPortal(
        (() => {
          const currentItem = items.find((i) => i.movie_id === rateModalItem.movieId && i.media_type === rateModalItem.mediaType);
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
              <p className="modal-rate-question">
                Как бы вы оценили «{rateModalItem.title}»?
              </p>
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
                <button type="button" className="btn-rate-secondary" onClick={rateModalAnim.requestClose}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
          );
        })(),
        document.body
      )}

      {detailModalItem && detailMovie && typeof document !== 'undefined' && createPortal(
        (() => {
          const item = items.find((i) => i.movie_id === detailModalItem.movieId && i.media_type === detailModalItem.mediaType);
          if (!item) return null;
          const runtimeStr = detailMovie.media_type !== 'tv' && detailMovie.runtime != null && detailMovie.runtime > 0
            ? detailMovie.runtime >= 60
              ? `${Math.floor(detailMovie.runtime / 60)} ч ${detailMovie.runtime % 60} мин`
              : `${detailMovie.runtime} мин`
            : null;
          const bannerImage = detailMovie.backdrop_path || detailMovie.poster_path || detailMovie.poster_path_thumb;
          return (
          <div
            className={`modal-overlay ${detailModalAnim.open ? 'modal-overlay--open' : ''} ${detailModalAnim.closing ? 'modal-overlay--closing' : ''}`}
            onClick={detailModalAnim.requestClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-movie-title"
          >
            <div className={`modal-card modal-card-detail modal-card-detail-scroll ${detailModalAnim.open ? 'modal-card--open' : ''} ${detailModalAnim.closing ? 'modal-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div
                className="detail-modal-banner"
                style={{ backgroundImage: bannerImage ? `url(${bannerImage})` : undefined }}
              >
                <button type="button" className="detail-modal-close" onClick={detailModalAnim.requestClose} aria-label="Закрыть">
                  ×
                </button>
                {item.watched && (
                  <span className="detail-modal-watched-icon" aria-hidden>
                    <CheckIcon size={18} />
                  </span>
                )}
                <div className="detail-modal-banner-content">
                  <h2 id="detail-movie-title" className="detail-modal-title">
                    {detailMovie.media_type === 'tv' && <span className="detail-modal-label">Сериал</span>}
                    {detailMovie.title}
                  </h2>
                  <div className="detail-modal-meta">
                    {detailMovie.release_date && (
                      <span className="detail-modal-meta-item">
                        <CalendarIconSmall />
                        {detailMovie.release_date.slice(0, 4)}
                      </span>
                    )}
                    {runtimeStr && (
                      <span className="detail-modal-meta-item">
                        <ClockIconSmall />
                        {runtimeStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="detail-modal-body">
                <section className="detail-modal-section">
                  <h3 className="detail-modal-section-title">Ваша оценка</h3>
                  <div className="detail-modal-rating-row">
                    <StarRatingDisplay value={item.watched && item.rating != null ? item.rating : 0} />
                    {item.watched && item.rating != null && (
                      <span className="detail-modal-rating-text">{Math.round(item.rating / 2)}/5</span>
                    )}
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
                <span className="tag-added tag-added-modal">Добавлено вами</span>
                <div className="detail-modal-actions">
                  {item.watched ? (
                    <button
                      type="button"
                      className="btn-watched btn-watched-modal"
                      onClick={() => unwatch(item.movie_id, item.media_type)}
                    >
                      <CheckIcon size={18} />
                      Просмотрено
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-watched-gray btn-watched-modal"
                      onClick={() => {
                        setRateModalItem({ movieId: item.movie_id, mediaType: item.media_type, title: item.title });
                      }}
                    >
                      Не просмотрено
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-delete-from-list"
                    onClick={() => { removeFromList(item.movie_id, item.media_type); detailModalAnim.requestClose(); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
          );
        })(),
        document.body
      )}
    </>
  );
}

function PartnerList() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: WatchlistItem[] }>('/api/watchlist/partner')
      .then((r) => setItems(r.items))
      .catch((e) => {
        if (e instanceof Error && e.message.includes('нет пары')) setError('У вас нет пары');
        else router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="loading-text">Загрузка…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (items.length === 0) return <p className="empty-text">Нет фильмов и сериалов или все просмотрены партнёром.</p>;

  return (
    <>
      <p className="section-desc" style={{ marginBottom: 12 }}>Только непросмотренные партнёром.</p>
      <ul className="film-grid">
        {items.map((item) => (
          <li key={`${item.media_type}-${item.movie_id}`} className="film-card">
            <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ display: 'block', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--border)' }}>
              <PosterImage src={item.poster_path} width={200} height={300} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Link>
            <div className="film-card-body film-card-body-grid">
              <h3 className="film-card-title">
                <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {item.title}
                </Link>
              </h3>
              <p className="film-card-year">{item.release_date ? String(item.release_date).slice(0, 4) : '—'}</p>
              <div className="film-card-rating-slot">
                <StarRatingDisplay value={0} />
              </div>
              <div className="film-card-actions" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function IntersectionsList() {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<IntersectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: IntersectionItem[] }>('/api/watchlist/intersections')
      .then((r) => setItems(r.items))
      .catch((e) => {
        if (e instanceof Error && e.message.includes('нет пары')) setError('У вас нет пары');
        else router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function setRating(movieId: number, mediaType: 'movie' | 'tv', rating: number) {
    try {
      await api(`/api/watchlist/me/${movieId}/rate?type=${mediaType}`, {
        method: 'PUT',
        body: JSON.stringify({ rating }),
      });
      setItems((prev) =>
        prev.map((i) =>
          i.movie_id === movieId && i.media_type === mediaType
            ? { ...i, my_rating: rating, average_rating: i.partner_rating != null ? (rating + i.partner_rating) / 2 : rating }
            : i
        )
      );
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  }

  if (loading) return <p className="loading-text">Загрузка…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (items.length === 0) return <p className="empty-text">Нет пересечений. Добавьте одинаковые фильмы или сериалы в свои списки.</p>;

  return (
    <>
      <p className="section-desc" style={{ marginBottom: 12 }}>
        Фильмы и сериалы, которые вы оба добавили и ещё не просмотрели.
      </p>
      <ul className="film-grid">
        {items.map((item) => (
          <li key={`${item.media_type}-${item.movie_id}`} className="film-card">
            <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ display: 'block', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--border)' }}>
              <PosterImage src={item.poster_path} width={200} height={300} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Link>
            <div className="film-card-body film-card-body-grid">
              <h3 className="film-card-title">
                <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {item.title}
                </Link>
              </h3>
              <p className="film-card-year">{item.release_date ? String(item.release_date).slice(0, 4) : '—'}</p>
              <div className="film-card-rating-slot film-card-rating-slot--text">
                {item.my_rating != null || item.partner_rating != null ? (
                  <>
                    {item.my_rating != null && `Вы: ${Math.round(item.my_rating / 2)}/5`}
                    {item.partner_rating != null && ` · Партнёр: ${Math.round(item.partner_rating / 2)}/5`}
                  </>
                ) : (
                  <StarRatingDisplay value={0} />
                )}
              </div>
              <div className="film-card-actions">
                <select
                  value={item.my_rating ?? ''}
                  onChange={(e) => setRating(item.movie_id, item.media_type, Number(e.target.value))}
                  className="film-card-select"
                >
                  <option value="">Оценить</option>
                  {[2, 4, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n / 2}/5</option>
                  ))}
                </select>
                <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} className="film-card-link">
                  Карточка
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
