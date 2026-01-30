'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <Link href="/">Pairly</Link>
      </header>
      <main className="app-content">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
