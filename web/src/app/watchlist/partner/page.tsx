'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { WatchlistItem } from '@/lib/api';

export default function PartnerWatchlistPage() {
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

  if (loading) return <div className="container">Загрузка...</div>;

  return (
    <div className="container">
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href="/watchlist/me">Мой список</Link>
        {' · '}
        <Link href="/watchlist/partner"><strong>Список партнёра</strong></Link>
        {' · '}
        <Link href="/watchlist/intersections">Пересечения</Link>
        {' · '}
        <Link href="/search">Поиск</Link>
        {' · '}
        <Link href="/pair">Пара</Link>
        {' · '}
        <Link href="/profile">Профиль</Link>
      </nav>
      <h1>Список партнёра</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Только непросмотренные партнёром фильмы.</p>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {!error && items.length === 0 && <p style={{ color: 'var(--muted)' }}>Нет фильмов или все просмотрены партнёром.</p>}
      {!error && items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.movie_id} className="list-row">
              {item.poster_path ? (
                <img src={item.poster_path} alt="" width={60} height={90} style={{ objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <div style={{ width: 60, height: 90, background: 'var(--surface)', borderRadius: 4 }} />
              )}
              <div>
                <Link href={`/movie/${item.movie_id}`} style={{ fontWeight: 500 }}>
                  {item.title}
                  {item.release_date && ` (${item.release_date.slice(0, 4)})`}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
