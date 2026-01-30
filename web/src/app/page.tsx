'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { WatchlistItem, IntersectionItem } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PosterImage } from '@/components/PosterImage';
import { StarRatingDisplay } from '@/components/StarRating';

type FilmsTab = 'me' | 'partner' | 'intersections';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as FilmsTab) || 'me';

  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthed(false);
      return;
    }
    api('/api/auth/me')
      .then(() => setAuthed(true))
      .catch(() => {
        localStorage.removeItem('token');
        setAuthed(false);
      });
  }, []);

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
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Pairly</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          Совместные списки фильмов для пар
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', borderRadius: 8, color: 'white' }}>
            Вход
          </Link>
          <Link href="/register" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--border)', borderRadius: 8 }}>
            Регистрация
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="container">
        <h1 className="page-title">Что смотреть</h1>
        <div className="films-tabs" role="tablist">
          <Link href="/?tab=me" className={tab === 'me' ? 'active' : ''} role="tab">Моё</Link>
          <Link href="/?tab=partner" className={tab === 'partner' ? 'active' : ''} role="tab">Партнёра</Link>
          <Link href="/?tab=intersections" className={tab === 'intersections' ? 'active' : ''} role="tab">Общие</Link>
        </div>
        <div style={{ display: tab === 'me' ? 'block' : 'none' }}><MyList /></div>
        <div style={{ display: tab === 'partner' ? 'block' : 'none' }}><PartnerList /></div>
        <div style={{ display: tab === 'intersections' ? 'block' : 'none' }}><IntersectionsList /></div>
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

  useEffect(() => {
    api<{ items: WatchlistItem[] }>('/api/watchlist/me')
      .then((r) => setItems(r.items))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function removeFromList(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}?type=${mediaType}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => !(i.movie_id === movieId && i.media_type === mediaType)));
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
      setItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating, watched: true } : i))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function unwatch(movieId: number, mediaType: 'movie' | 'tv') {
    try {
      await api(`/api/watchlist/me/${movieId}/rate?type=${mediaType}`, { method: 'DELETE' });
      setItems((prev) =>
        prev.map((i) => (i.movie_id === movieId && i.media_type === mediaType ? { ...i, rating: null, watched: false } : i))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
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
              <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ display: 'block', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--border)' }}>
                <PosterImage src={item.poster_path} width={200} height={300} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              <div className="film-card-body">
                <h3 className="film-card-title">
                  <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {item.title}
                  </Link>
                </h3>
                <p className="film-card-year">{item.release_date ? String(item.release_date).slice(0, 4) : '—'}</p>
                {item.watched && item.rating != null && (
                  <div style={{ marginBottom: 8 }}>
                    <StarRatingDisplay value={item.rating} />
                    <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--muted)' }}>{Math.round(item.rating / 2)}/5</span>
                  </div>
                )}
                <div className="film-card-actions">
                  {item.watched ? (
                    <>
                      <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} className="btn-watched" style={{ textDecoration: 'none', fontSize: 12, padding: '6px 10px' }}>
                        ✓ Просмотрено
                      </Link>
                      <button type="button" onClick={() => unwatch(item.movie_id, item.media_type)} style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: 12, padding: '6px 10px' }}>
                        Снять
                      </button>
                    </>
                  ) : (
                    <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} className="btn-mark-watched" style={{ textDecoration: 'none', fontSize: 12 }}>
                      <span className="check-icon" style={{ color: '#16a34a' }}>✓</span>
                      Отметить просмотренным
                    </Link>
                  )}
                  <button type="button" className="btn-delete" onClick={() => removeFromList(item.movie_id, item.media_type)}>
                    Удалить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
            <div className="film-card-body">
              <h3 className="film-card-title">
                <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {item.title}
                </Link>
              </h3>
              <p className="film-card-year">{item.release_date ? String(item.release_date).slice(0, 4) : '—'}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function IntersectionsList() {
  const router = useRouter();
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
      alert(e instanceof Error ? e.message : 'Ошибка');
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
            <div className="film-card-body">
              <h3 className="film-card-title">
                <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {item.title}
                </Link>
              </h3>
              <p className="film-card-year">{item.release_date ? String(item.release_date).slice(0, 4) : '—'}</p>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                {item.my_rating != null && `Вы: ${Math.round(item.my_rating / 2)}/5`}
                {item.partner_rating != null && ` · Партнёр: ${Math.round(item.partner_rating / 2)}/5`}
              </div>
              <div className="film-card-actions" style={{ marginTop: 8 }}>
                <select
                  value={item.my_rating ?? ''}
                  onChange={(e) => setRating(item.movie_id, item.media_type, Number(e.target.value))}
                  style={{ padding: '6px 8px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                >
                  <option value="">Оценить</option>
                  {[2, 4, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n / 2}/5</option>
                  ))}
                </select>
                <Link href={item.media_type === 'tv' ? `/movie/${item.movie_id}?type=tv` : `/movie/${item.movie_id}`} style={{ fontSize: 12, color: 'var(--accent)' }}>
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
