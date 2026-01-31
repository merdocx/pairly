'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

const MIN_SHOW_MS = 300;

/**
 * Показывает «Загрузка…» при смене маршрута, чтобы не было белого кадра при навигации.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const prevPathRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;
    setShow(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setShow(false);
    }, MIN_SHOW_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Загрузка"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, pointerEvents: 'none' }}
    >
      <div className="loading-screen-logo" aria-hidden style={{ fontSize: 40, lineHeight: 1 }}>∞</div>
      <div className="loading-spinner" aria-hidden />
      <p className="loading-screen-text">Загрузка…</p>
    </div>
  );
}
