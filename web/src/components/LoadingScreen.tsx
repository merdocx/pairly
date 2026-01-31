'use client';

import { PairlyLogoMark } from './PairlyLogo';

/**
 * Минималистичный экран загрузки: символ ∞ (логотип) + спиннер + «Загрузка…».
 * Светлый фон, по центру.
 */
export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="Загрузка">
      <div className="loading-screen-logo" aria-hidden>
        <PairlyLogoMark size={40} />
      </div>
      <div className="loading-spinner" aria-hidden />
      <p className="loading-screen-text">Загрузка…</p>
    </div>
  );
}
