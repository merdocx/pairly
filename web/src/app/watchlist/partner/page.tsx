'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PartnerWatchlistPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/?tab=partner');
  }, [router]);
  return <div className="container">Перенаправление…</div>;
}
