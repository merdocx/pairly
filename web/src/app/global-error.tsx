'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', padding: 24, background: '#f9fafb' }}>
        <h2 style={{ color: '#0a0a0a' }}>Что-то пошло не так</h2>
        <p style={{ color: '#4a5565', marginBottom: 16 }}>{error.message}</p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: '#9810fa',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Попробовать снова
        </button>
      </body>
    </html>
  );
}
