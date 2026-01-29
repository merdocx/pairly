'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { WatchlistItem } from '@/lib/api';

export default function MyWatchlistPage() {
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

  if (loading) return <div className="container">Загрузка...</div>;

  return (
    <div className="container">
      <nav className="app-nav">
        <Link href="/watchlist/me"><strong>Мой список</strong></Link>
        {' · '}
        <Link href="/watchlist/partner">Список партнёра</Link>
        {' · '}
        <Link href="/watchlist/intersections">Пересечения</Link>
        {' · '}
        <Link href="/search">Поиск</Link>
        {' · '}
        <Link href="/pair">Пара</Link>
        {' · '}
        <Link href="/profile">Профиль</Link>
      </nav>
      <h1>Мой список «Буду смотреть»</h1>
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
            <li
              key={item.movie_id}
              className="list-row"
              style={{ opacity: item.watched ? 0.8 : 1 }}
            >
              {item.poster_path ? (
                <img src={item.poster_path} alt="" width={60} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <div style={{ width: 60, height: 90, background: 'var(--surface)', borderRadius: 4 }} />
              )}
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
    </div>
  );
}
