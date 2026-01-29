'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyWatchlistPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return <div className="container">Перенаправление…</div>;
}
