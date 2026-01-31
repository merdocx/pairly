import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientLayoutContent } from '@/components/ClientLayoutContent';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Pairly',
  description: 'Совместные списки фильмов для пар',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className={inter.className} style={{ background: '#f9fafb', margin: 0 }}>
        <noscript>
          <div
            className="min-h-viewport"
            style={{
              padding: 24,
              textAlign: 'center',
              background: 'var(--bg)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <p style={{ margin: 0 }}>Для работы приложения включите JavaScript.</p>
          </div>
        </noscript>
        <ClientLayoutContent>{children}</ClientLayoutContent>
      </body>
    </html>
  );
}
