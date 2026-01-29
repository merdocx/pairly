'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'me';
  const isHome = pathname === '/';
  const isSearch = pathname === '/search';
  const isProfile = pathname === '/profile';

  return (
    <nav className="bottom-nav" role="navigation">
      <Link href="/?tab=me" className={isHome && tab === 'me' ? 'active' : ''}>
        Мое
      </Link>
      <Link href="/?tab=partner" className={isHome && tab === 'partner' ? 'active' : ''}>
        Партнера
      </Link>
      <Link href="/?tab=intersections" className={isHome && tab === 'intersections' ? 'active' : ''}>
        Общее
      </Link>
      <Link href="/search" className={isSearch ? 'active' : ''}>
        Поиск
      </Link>
      <Link href="/profile" className={isProfile ? 'active' : ''}>
        Профиль
      </Link>
    </nav>
  );
}
