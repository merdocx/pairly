'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User, Pair } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pair, setPair] = useState<{ pair: Pair | null } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [pairError, setPairError] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api<User>('/api/auth/me')
      .then(setUser)
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    api<{ pair: Pair | null }>('/api/pairs')
      .then(setPair)
      .catch(() => setPair({ pair: null }));
  }, [user]);

  function handleLogout() {
    api('/api/auth/logout', { method: 'POST', token: null }).catch(() => {}).finally(() => {
      localStorage.removeItem('token');
      router.replace('/login');
    });
  }

  async function handleCreatePair() {
    setPairError('');
    setPairLoading(true);
    try {
      const data = await api<{ pair: { id: string; code: string }; message: string }>('/api/pairs/create', {
        method: 'POST',
      });
      setPair({ pair: { id: data.pair.id, code: data.pair.code, partner: null } });
    } catch (err) {
      setPairError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setPairLoading(false);
    }
  }

  async function handleJoinPair(e: React.FormEvent) {
    e.preventDefault();
    setPairError('');
    setJoining(true);
    try {
      await api<{ message: string }>('/api/pairs/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      setPair(null);
      api<{ pair: Pair | null }>('/api/pairs').then(setPair);
    } catch (err) {
      setPairError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeavePair() {
    if (!confirm('Выйти из пары?')) return;
    setPairError('');
    try {
      await api<{ message: string }>('/api/pairs/leave', { method: 'POST' });
      setPair({ pair: null });
    } catch (err) {
      setPairError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  if (loading) return <div className="container">Загрузка...</div>;
  if (!user) return null;

  return (
    <AppLayout>
      <div className="container">
        <h1>Профиль</h1>
        <div style={{ maxWidth: 400, marginBottom: '2rem' }}>
          <p><strong>Имя:</strong> {user.name || '—'}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            В MVP редактирование профиля недоступно.
          </p>
          <button type="button" onClick={handleLogout} style={{ marginTop: '1rem' }}>
            Выйти
          </button>
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Пара</h2>
        {pairError && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{pairError}</p>}
        {pair === null ? (
          <p style={{ color: 'var(--muted)' }}>Загрузка…</p>
        ) : pair.pair ? (
          <>
            {pair.pair.partner ? (
              <p style={{ color: 'var(--muted)' }}>Партнёр: {pair.pair.partner.name || pair.pair.partner.email}</p>
            ) : (
              <>
                <p style={{ marginBottom: '0.5rem' }}>Покажите этот код партнёру:</p>
                <p style={{ fontSize: '1.5rem', letterSpacing: 4, fontFamily: 'monospace' }}>{pair.pair.code}</p>
              </>
            )}
            <button onClick={handleLeavePair} style={{ marginTop: '1rem', background: 'var(--error)' }}>
              Выйти из пары
            </button>
          </>
        ) : (
          <>
            <button onClick={handleCreatePair} disabled={pairLoading} style={{ marginBottom: '1.5rem' }}>
              {pairLoading ? 'Создание...' : 'Создать пару (получить код)'}
            </button>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Или введите код партнёра</p>
            <form onSubmit={handleJoinPair} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                style={{ maxWidth: 120, textAlign: 'center', letterSpacing: 4 }}
              />
              <button type="submit" disabled={joining || code.length !== 6}>
                {joining ? 'Присоединяюсь...' : 'Присоединиться'}
              </button>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  );
}
