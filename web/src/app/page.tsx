'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { WatchlistItem, IntersectionItem } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PosterImage } from '@/components/PosterImage';

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
  const [sort, setSort] = useState<'added_at' | 'rating' | 'title'>('added_at');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: WatchlistItem[] }>(`/api/watchlist/me?sort=${sort}`)
      .then((r) => setItems(r.items))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [sort, router]);

  async function removeFromList(movieId: number) {
    try {
      await api(`/api/watchlist/me/${movieId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.movie_id !== movieId));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function setRating(movieId: number, rating: number) {
    try {
      await api(`/api/watchlist/me/${movieId}/rate`, {
        method: 'PUT',
        body: JSON.stringify({ rating }),
      });
      setItems((prev) =>
        prev.map((i) => (i.movie_id === movieId ? { ...i, rating, watched: true } : i))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function unwatch(movieId: number) {
    try {
      await api(`/api/watchlist/me/${movieId}/rate`, { method: 'DELETE' });
      setItems((prev) =>
        prev.map((i) => (i.movie_id === movieId ? { ...i, rating: null, watched: false } : i))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Загрузка…</p>;

  return (
    <>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }} className="sort-buttons">
        Сортировка:{' '}
        <button type="button" onClick={() => setSort('added_at')} className={sort === 'added_at' ? 'active' : ''}>
          по дате
        </button>
        <button type="button" onClick={() => setSort('title')} className={sort === 'title' ? 'active' : ''}>
          по названию
        </button>
        <button type="button" onClick={() => setSort('rating')} className={sort === 'rating' ? 'active' : ''}>
          по рейтингу
        </button>
      </p>
      {items.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Список пуст. Добавьте фильмы из поиска.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.movie_id} className="list-row" style={{ opacity: item.watched ? 0.8 : 1 }}>
              <PosterImage src={item.poster_path} width={60} height={90} />
              <div style={{ flex: 1 }}>
                <Link href={`/movie/${item.movie_id}`} style={{ fontWeight: 500 }}>
                  {item.title}
                  {item.release_date && ` (${item.release_date.slice(0, 4)})`}
                </Link>
                {item.watched && (
                  <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: '0.9rem' }}>
                    Просмотрено {item.rating != null && `★ ${item.rating}`}
                  </span>
                )}
              </div>
              {item.watched ? (
                <div>
                  <select
                    value={item.rating ?? ''}
                    onChange={(e) => setRating(item.movie_id, Number(e.target.value))}
                    style={{ marginRight: 8, padding: 4, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => unwatch(item.movie_id)} style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                    Снять «Просмотрено»
                  </button>
                </div>
              ) : (
                <div>
                  <select
                    onChange={(e) => setRating(item.movie_id, Number(e.target.value))}
                    style={{ marginRight: 8, padding: 4, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  >
                    <option value="">Оценить</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>★ {n}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="button" onClick={() => removeFromList(item.movie_id)} style={{ background: 'var(--error)', fontSize: '0.85rem' }}>
                Удалить
              </button>
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

  if (loading) return <p style={{ color: 'var(--muted)' }}>Загрузка…</p>;
  if (error) return <p style={{ color: 'var(--error)' }}>{error}</p>;
  if (items.length === 0) return <p style={{ color: 'var(--muted)' }}>Нет фильмов или все просмотрены партнёром.</p>;

  return (
    <>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Только непросмотренные партнёром фильмы.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li key={item.movie_id} className="list-row">
            <PosterImage src={item.poster_path} width={60} height={90} />
            <div>
              <Link href={`/movie/${item.movie_id}`} style={{ fontWeight: 500 }}>
                {item.title}
                {item.release_date && ` (${item.release_date.slice(0, 4)})`}
              </Link>
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

  async function setRating(movieId: number, rating: number) {
    try {
      await api(`/api/watchlist/me/${movieId}/rate`, {
        method: 'PUT',
        body: JSON.stringify({ rating }),
      });
      setItems((prev) =>
        prev.map((i) =>
          i.movie_id === movieId
            ? { ...i, my_rating: rating, average_rating: i.partner_rating != null ? (rating + i.partner_rating) / 2 : rating }
            : i
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Загрузка…</p>;
  if (error) return <p style={{ color: 'var(--error)' }}>{error}</p>;
  if (items.length === 0) return <p style={{ color: 'var(--muted)' }}>Нет пересечений. Добавьте одинаковые фильмы в свои списки.</p>;

  return (
    <>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
        Фильмы, которые вы оба добавили и ещё не просмотрели.
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li key={item.movie_id} className="list-row">
            <PosterImage src={item.poster_path} width={60} height={90} />
            <div style={{ flex: 1 }}>
              <Link href={`/movie/${item.movie_id}`} style={{ fontWeight: 500 }}>
                {item.title}
                {item.release_date && ` (${String(item.release_date).slice(0, 4)})`}
              </Link>
              <div style={{ marginTop: 4, fontSize: '0.9rem', color: 'var(--muted)' }}>
                {item.my_rating != null && `Ваша оценка: ★ ${item.my_rating}`}
                {item.partner_rating != null && ` · Партнёр: ★ ${item.partner_rating}`}
                {item.average_rating != null && ` · Средняя: ${item.average_rating}`}
              </div>
            </div>
            <div>
              <select
                value={item.my_rating ?? ''}
                onChange={(e) => setRating(item.movie_id, Number(e.target.value))}
                style={{ padding: 4, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
              >
                <option value="">Оценить</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>★ {n}</option>
                ))}
              </select>
            </div>
            <Link href={`/movie/${item.movie_id}`}>Карточка</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
