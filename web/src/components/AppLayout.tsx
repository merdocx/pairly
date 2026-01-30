'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import BottomNav from './BottomNav';
import { PairlyLogoMark } from './PairlyLogo';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <Link href="/" className="app-header-brand">
          <PairlyLogoMark size={28} className="app-header-logo-icon" />
          <span>Pairly</span>
        </Link>
      </header>
      <main className="app-content">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
