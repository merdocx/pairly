'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User, Pair } from '@/lib/api';
import type { WatchlistItem } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { useToast } from '@/components/Toast';

function AvatarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pair, setPair] = useState<{ pair: Pair | null } | null>(null);
  const [watchlistStats, setWatchlistStats] = useState<{ total: number; watched: number }>({ total: 0, watched: 0 });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [pairError, setPairError] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [addPairModalOpen, setAddPairModalOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [justCreatedCode, setJustCreatedCode] = useState<string | null>(null);
  const addPairModalAnim = useModalAnimation(addPairModalOpen, () => setAddPairModalOpen(false));
  const leaveConfirmAnim = useModalAnimation(leaveConfirmOpen, () => setLeaveConfirmOpen(false));
  const { showToast } = useToast();

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

  useEffect(() => {
    if (!user) return;
    api<{ items: WatchlistItem[] }>('/api/watchlist/me')
      .then((r) => {
        const items = r.items;
        setWatchlistStats({
          total: items.length,
          watched: items.filter((i) => i.watched).length,
        });
      })
      .catch(() => {});
  }, [user]);

  function handleLogout() {
    api('/api/auth/logout', { method: 'POST', token: null }).catch(() => {}).finally(() => {
      localStorage.removeItem('token');
      router.replace('/login');
    });
  }

  async function handleOpenAddPair() {
    setPairError('');
    if (!pair?.pair) {
      setPairLoading(true);
      try {
        const data = await api<{ pair: { id: string; code: string }; message: string }>('/api/pairs/create', {
          method: 'POST',
        });
        setPair({ pair: { id: data.pair.id, code: data.pair.code, partner: null } });
        setJustCreatedCode(data.pair.code);
        setAddPairModalOpen(true);
      } catch (err) {
        setPairError(err instanceof Error ? err.message : 'Ошибка');
      } finally {
        setPairLoading(false);
      }
    } else {
      setJustCreatedCode(pair.pair.code);
      setAddPairModalOpen(true);
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
      const res = await api<{ pair: Pair | null }>('/api/pairs');
      setPair(res);
      setAddPairModalOpen(false);
      setCode('');
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

  function copyPairCode() {
    const c = pair?.pair?.code || justCreatedCode;
    if (c) {
      navigator.clipboard.writeText(c).then(() => showToast('Код скопирован'));
    }
  }

  if (loading) return <AppLayout><div className="container"><LoadingScreen /></div></AppLayout>;
  if (!user) return null;

  const pairCode = pair?.pair?.code || justCreatedCode;

  return (
    <AppLayout className="layout-profile">
      <div className="container">
        <div className="profile-card">
          <div className="profile-card-row">
            <div className="profile-avatar">
              <AvatarIcon />
            </div>
            <div>
              <p className="profile-user-name">{user.name || '—'}</p>
              <p className="profile-user-email">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h2 className="profile-section-title">Статус пары</h2>
          {pairError && <p className="error-text" style={{ marginTop: 0 }}>{pairError}</p>}
          {pair === null ? (
            <p className="loading-text" style={{ margin: 0 }}>Загрузка…</p>
          ) : pair.pair ? (
            <>
              <div className="pair-status-box">
                <p className="pair-status-label">В паре с</p>
                <p className="pair-status-name">{pair.pair.partner?.name || pair.pair.partner?.email || '—'}</p>
              </div>
              <button type="button" onClick={handleLeavePair} className="profile-btn-secondary">
                Отвязать
              </button>
            </>
          ) : (
            <button type="button" onClick={handleOpenAddPair} disabled={pairLoading} className="profile-btn-secondary">
              {pairLoading ? 'Создание…' : 'Добавить пару'}
            </button>
          )}
        </div>

        <div className="profile-card">
          <p className="profile-stats">Фильмов в списке: <strong>{watchlistStats.total}</strong></p>
          <p className="profile-stats">Просмотрено фильмов: <strong>{watchlistStats.watched}</strong></p>
        </div>

        <button type="button" onClick={handleLogout} className="btn-leave">
          <LeaveIcon />
          Выйти
        </button>
      </div>

      {leaveConfirmOpen && (
        <div
          className={`modal-overlay ${leaveConfirmAnim.open ? 'modal-overlay--open' : ''} ${leaveConfirmAnim.closing ? 'modal-overlay--closing' : ''}`}
          onClick={leaveConfirmAnim.requestClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-confirm-title"
        >
          <div className={`modal-card ${leaveConfirmAnim.open ? 'modal-card--open' : ''} ${leaveConfirmAnim.closing ? 'modal-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h2 id="leave-confirm-title" className="profile-section-title" style={{ marginBottom: 16 }}>Выйти из пары?</h2>
            <div className="modal-add-pair-actions">
              <button type="button" className="btn-rate-secondary btn-rate-secondary-full" onClick={leaveConfirmAnim.requestClose}>
                Отмена
              </button>
              <button type="button" className="btn-login-primary btn-login-primary-full" style={{ background: 'var(--error)' }} onClick={doLeavePair}>
                Выйти из пары
              </button>
            </div>
          </div>
        </div>
      )}

      {addPairModalOpen && (
        <div
          className={`modal-overlay ${addPairModalAnim.open ? 'modal-overlay--open' : ''} ${addPairModalAnim.closing ? 'modal-overlay--closing' : ''}`}
          onClick={addPairModalAnim.requestClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-pair-title"
        >
          <div className={`modal-card ${addPairModalAnim.open ? 'modal-card--open' : ''} ${addPairModalAnim.closing ? 'modal-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h2 id="add-pair-title">Добавить пару</h2>
            <p className="section-desc" style={{ marginBottom: 16 }}>
              Поделитесь своим кодом с партнёром или введите его код для создания пары.
            </p>
            {pairError && <p className="error-text" style={{ marginTop: 0 }}>{pairError}</p>}
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Ваш код для создания пары</label>
            <div className="pair-code-display">
              <span className="pair-code-value">{pairCode}</span>
              <button type="button" className="btn-copy" onClick={copyPairCode} title="Копировать">
                <CopyIcon />
              </button>
            </div>
            <p className="section-desc" style={{ marginTop: 0, marginBottom: 16 }}>Поделитесь этим кодом с вашим партнёром</p>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Код партнёра</label>
            <form onSubmit={handleJoinPair}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="pair-code-input"
                style={{ width: '100%', maxWidth: 'none', marginBottom: 8 }}
              />
              <p className="section-desc" style={{ marginTop: 0, marginBottom: 16 }}>Введите 6-значный код вашего партнёра</p>
              <div className="modal-add-pair-actions">
                <button type="button" className="btn-rate-secondary btn-rate-secondary-full" onClick={addPairModalAnim.requestClose}>
                  Отмена
                </button>
                <button type="submit" disabled={joining || code.length !== 6} className="btn-login-primary btn-login-primary-full">
                  {joining ? '…' : 'Создать пару'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
