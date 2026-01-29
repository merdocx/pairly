'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { IntersectionItem } from '@/lib/api';

export default function IntersectionsPage() {
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

  if (loading) return <div className="container">Загрузка...</div>;

  return (
    <div className="container">
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href="/watchlist/me">Мой список</Link>
        {' · '}
        <Link href="/watchlist/partner">Список партнёра</Link>
        {' · '}
        <Link href="/watchlist/intersections"><strong>Пересечения</strong></Link>
        {' · '}
        <Link href="/search">Поиск</Link>
        {' · '}
        <Link href="/pair">Пара</Link>
        {' · '}
        <Link href="/profile">Профиль</Link>
      </nav>
      <h1>Пересечения</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
        Фильмы, которые вы оба добавили и ещё не просмотрели.
      </p>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {!error && items.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>Нет пересечений. Добавьте одинаковые фильмы в свои списки.</p>
      )}
      {!error && items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.movie_id} className="list-row">
              {item.poster_path ? (
                <img src={item.poster_path} alt="" width={60} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <div style={{ width: 60, height: 90, background: 'var(--surface)', borderRadius: 4 }} />
              )}
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
      )}
    </div>
  );
}
