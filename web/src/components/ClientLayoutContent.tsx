'use client';

import { Suspense, useEffect, useState } from 'react';
import { NavigationProgress } from '@/components/NavigationProgress';
import PageTransition from '@/components/PageTransition';
import { ToastProvider } from '@/components/Toast';

function NavFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--muted)',
        fontSize: 14,
      }}
    >
      Загрузка…
    </div>
  );
}

/**
 * Единая клиентская оболочка: «Загрузка…» до монтирования, затем провайдеры и навигация.
 * Убирает белый экран при медленной загрузке JS и при навигации.
 */
export function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="loading-screen-logo" aria-hidden style={{ fontSize: 40, lineHeight: 1 }}>
          ∞
        </div>
        <div className="loading-spinner" aria-hidden />
        <p className="loading-screen-text">Загрузка…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <NavigationProgress />
      <PageTransition>
        <Suspense fallback={<NavFallback />}>{children}</Suspense>
      </PageTransition>
    </ToastProvider>
  );
}
