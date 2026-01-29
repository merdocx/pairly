'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PairPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return <div className="container">Перенаправление…</div>;
}
