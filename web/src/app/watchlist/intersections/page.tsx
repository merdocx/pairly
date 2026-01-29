'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntersectionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/?tab=intersections');
  }, [router]);
  return <div className="container">Перенаправление…</div>;
}
