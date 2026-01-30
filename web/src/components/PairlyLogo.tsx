'use client';

/**
 * Логотип Pairly из Figma: два переплетённых кольца + опционально текст.
 * Используется в хедере (белый) и на карточках логина/регистрации (градиент через currentColor).
 */
/** Два переплетённых кольца (как в Figma). */
export function PairlyLogoMark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="15" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function PairlyLogoWithText({ showText = true, size = 24 }: { showText?: boolean; size?: number }) {
  return (
    <>
      <PairlyLogoMark size={size} />
      {showText && <span className="login-logo">Pairly</span>}
    </>
  );
}
