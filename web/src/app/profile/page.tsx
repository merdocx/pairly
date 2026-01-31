'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cropper, { type Area } from 'react-easy-crop';
import { api, getApiUrl } from '@/lib/api';
import type { User, Pair } from '@/lib/api';
import type { WatchlistItem } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { useToast } from '@/components/Toast';

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const img = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9);
  });
}

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
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const addPairModalAnim = useModalAnimation(addPairModalOpen, () => setAddPairModalOpen(false));
  const leaveConfirmAnim = useModalAnimation(leaveConfirmOpen, () => setLeaveConfirmOpen(false));
  const avatarModalAnim = useModalAnimation(avatarModalOpen, () => {
    setAvatarModalOpen(false);
    setAvatarFile(null);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  });
  const { showToast } = useToast();

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

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

  async function handleAvatarUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarPreviewUrl) return;
    const area = croppedAreaPixels;
    if (!area) {
      showToast('Подвиньте или увеличьте фото, затем нажмите Загрузить');
      return;
    }
    setAvatarUploading(true);
    try {
      const blob = await getCroppedImg(avatarPreviewUrl, area);
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');
      const base = getApiUrl();
      const res = await fetch(`${base}/api/profile/avatar`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Ошибка загрузки');
      }
      const data = (await res.json()) as { avatar_url: string };
      setUser((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : null));
      avatarModalAnim.requestClose();
      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      setCroppedAreaPixels(null);
      showToast('Фото обновлено');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAvatarFile(file);
    if (file) setAvatarPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  }

  if (loading) return <AppLayout><div className="container"><LoadingScreen /></div></AppLayout>;
  if (!user) return null;

  const pairCode = pair?.pair?.code || justCreatedCode;

  return (
    <AppLayout className="layout-profile">
      <div className="container">
        <div className="profile-card">
          <div className="profile-card-row">
            <button
              type="button"
              className="profile-avatar-wrap"
              onClick={() => setAvatarModalOpen(true)}
              aria-label="Изменить фото"
            >
              <div className="profile-avatar">
                {user.avatar_url ? (
                  <img src={`${getApiUrl()}${user.avatar_url}`} alt="" className="profile-avatar-img" />
                ) : (
                  <AvatarIcon />
                )}
              </div>
              <span className="profile-avatar-change">Изменить</span>
            </button>
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
              <button type="button" onClick={() => setLeaveConfirmOpen(true)} className="profile-btn-secondary">
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

      {avatarModalOpen && (
        <div
          className={`modal-overlay ${avatarModalAnim.open ? 'modal-overlay--open' : ''} ${avatarModalAnim.closing ? 'modal-overlay--closing' : ''}`}
          onClick={avatarModalAnim.requestClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-modal-title"
        >
          <div className={`modal-card ${avatarModalAnim.open ? 'modal-card--open' : ''} ${avatarModalAnim.closing ? 'modal-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h2 id="avatar-modal-title" className="profile-section-title" style={{ marginBottom: 16 }}>Изменить фото</h2>
            <form onSubmit={handleAvatarUpload}>
              {!avatarPreviewUrl ? (
                <>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    className="profile-avatar-input"
                  />
                  <p className="section-desc" style={{ marginTop: 8, marginBottom: 16 }}>JPEG, PNG или WebP, не более 2 МБ</p>
                </>
              ) : (
                <>
                  <div className="profile-avatar-crop-wrap">
                    <Cropper
                      image={avatarPreviewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <p className="section-desc" style={{ marginTop: 8, marginBottom: 8 }}>Подвиньте фото или измените масштаб — в кружочке будет видна только эта область</p>
                  <div className="profile-avatar-zoom-row">
                    <span className="profile-avatar-zoom-label">Масштаб</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="profile-avatar-zoom-slider"
                    />
                  </div>
                  <button
                    type="button"
                    className="profile-avatar-change-file"
                    onClick={() => document.getElementById('profile-avatar-file-input')?.click()}
                  >
                    Выбрать другое фото
                  </button>
                  <input
                    id="profile-avatar-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    className="profile-avatar-input profile-avatar-input--hidden"
                  />
                </>
              )}
              <div className="modal-add-pair-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn-rate-secondary btn-rate-secondary-full" onClick={avatarModalAnim.requestClose}>
                  Отмена
                </button>
                <button type="submit" disabled={!avatarFile || avatarUploading} className="btn-login-primary btn-login-primary-full">
                  {avatarUploading ? 'Загрузка…' : 'Загрузить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
