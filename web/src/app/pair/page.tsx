'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Pair } from '@/lib/api';

export default function PairPage() {
  const router = useRouter();
  const [pair, setPair] = useState<{ pair: Pair | null } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api<{ pair: Pair | null }>('/api/pairs')
      .then(setPair)
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleCreate() {
    setError('');
    setLoading(true);
    try {
      const data = await api<{ pair: { id: string; code: string }; message: string }>('/api/pairs/create', {
        method: 'POST',
      });
      setPair({ pair: { id: data.pair.id, code: data.pair.code, partner: null } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      await api<{ message: string }>('/api/pairs/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      router.push('/watchlist/me');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!confirm('Выйти из пары?')) return;
    setError('');
    try {
      await api<{ message: string }>('/api/pairs/leave', { method: 'POST' });
      setPair({ pair: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  if (pair === null) return <div className="container">Загрузка...</div>;

  return (
    <div className="container" style={{ maxWidth: 480, marginTop: '2rem' }}>
      <nav className="app-nav">
        <Link href="/watchlist/me">Мой список</Link>
        {' · '}
        <Link href="/search">Поиск</Link>
        {' · '}
        <Link href="/profile">Профиль</Link>
      </nav>
      <h1 style={{ marginBottom: '1rem' }}>Пара</h1>
      {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}

      {pair.pair ? (
        <>
          {pair.pair.partner ? (
            <p style={{ color: 'var(--muted)' }}>Партнёр: {pair.pair.partner.name || pair.pair.partner.email}</p>
          ) : (
            <>
              <p style={{ marginBottom: '0.5rem' }}>Покажите этот код партнёру:</p>
              <p style={{ fontSize: '1.5rem', letterSpacing: 4, fontFamily: 'monospace' }}>{pair.pair.code}</p>
            </>
          )}
          <button onClick={handleLeave} style={{ marginTop: '1rem', background: 'var(--error)' }}>
            Выйти из пары
          </button>
        </>
      ) : (
        <>
          <button onClick={handleCreate} disabled={loading} style={{ marginBottom: '2rem' }}>
            {loading ? 'Создание...' : 'Создать пару (получить код)'}
          </button>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Или введите код партнёра</h2>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{ maxWidth: 120, textAlign: 'center', letterSpacing: 4 }}
            />
            <button type="submit" disabled={joining || code.length !== 6} style={{ marginLeft: 8 }}>
              {joining ? 'Присоединяюсь...' : 'Присоединиться'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
