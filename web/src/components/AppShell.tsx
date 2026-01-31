'use client';

import { useEffect, useState } from 'react';

/**
 * Показывает «Загрузка…» до первого монтирования на клиенте, затем children.
 * Убирает белый экран при медленной загрузке JS или до гидрации.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="loading-screen-logo" aria-hidden style={{ fontSize: 40, lineHeight: 1 }}>∞</div>
        <div className="loading-spinner" aria-hidden />
        <p className="loading-screen-text">Загрузка…</p>
      </div>
    );
  }

  return <>{children}</>;
}
