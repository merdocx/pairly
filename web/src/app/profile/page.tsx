'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<User>('/api/auth/me')
      .then(setUser)
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('token');
    router.replace('/login');
  }

  if (loading) return <div className="container">Загрузка...</div>;
  if (!user) return null;

  return (
    <div className="container">
      <nav className="app-nav">
        <Link href="/watchlist/me">Мой список</Link>
        {' · '}
        <Link href="/watchlist/partner">Список партнёра</Link>
        {' · '}
        <Link href="/watchlist/intersections">Пересечения</Link>
        {' · '}
        <Link href="/search">Поиск</Link>
        {' · '}
        <Link href="/pair">Пара</Link>
        {' · '}
        <Link href="/profile"><strong>Профиль</strong></Link>
      </nav>
      <h1>Профиль</h1>
      <div style={{ maxWidth: 400 }}>
        <p><strong>Имя:</strong> {user.name || '—'}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          В MVP редактирование профиля недоступно.
        </p>
        <button type="button" onClick={handleLogout} style={{ marginTop: '1rem' }}>
          Выйти
        </button>
      </div>
    </div>
  );
}
