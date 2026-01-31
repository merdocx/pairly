import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { NavigationProgress } from '@/components/NavigationProgress';
import PageTransition from '@/components/PageTransition';
import { ToastProvider } from '@/components/Toast';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Pairly',
  description: 'Совместные списки фильмов для пар',
};

/** Fallback при suspend (напр. useSearchParams) — чтобы не было белого экрана. */
function NavFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: 14 }}>
      Загрузка…
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className={inter.className}>
        <ToastProvider>
          <NavigationProgress />
          <PageTransition>
            <Suspense fallback={<NavFallback />}>
              {children}
            </Suspense>
          </PageTransition>
        </ToastProvider>
      </body>
    </html>
  );
}
