'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div
      className="min-h-viewport"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Что-то пошло не так</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>{error.message}</p>
      <button
        type="button"
        onClick={reset}
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Попробовать снова
      </button>
    </div>
  );
}
