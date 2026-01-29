'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/watchlist/me');
    }
  }, [router]);

  return (
    <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Pairly</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Совместные списки фильмов для пар
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/login" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', borderRadius: 8, color: 'white' }}>
          Вход
        </Link>
        <Link href="/register" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--border)', borderRadius: 8 }}>
          Регистрация
        </Link>
      </div>
    </div>
  );
}
