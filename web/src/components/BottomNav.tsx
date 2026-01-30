'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/* Иконки из Figma (BottomNav), stroke=currentColor для активного/неактивного цвета */
function IconWatch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7.5H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16.5H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 16.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21L16.7 16.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 20.662V19C7 18.4696 7.21071 17.9609 7.58579 17.5858C7.96086 17.2107 8.46957 17 9 17H15C15.5304 17 16.0391 17.2107 16.4142 17.5858C16.7893 17.9609 17 18.4696 17 19V20.662" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'me';
  const isHome = pathname === '/';
  const isSearch = pathname === '/search';
  const isProfile = pathname === '/profile';

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Нижнее меню">
      <Link href="/?tab=me" className={isHome ? 'active' : ''}>
        <span className="bottom-nav-icon"><IconWatch /></span>
        <span className="bottom-nav-label">Что смотреть</span>
      </Link>
      <Link href="/search" className={isSearch ? 'active' : ''}>
        <span className="bottom-nav-icon"><IconSearch /></span>
        <span className="bottom-nav-label">Поиск</span>
      </Link>
      <Link href="/profile" className={isProfile ? 'active' : ''}>
        <span className="bottom-nav-icon"><IconProfile /></span>
        <span className="bottom-nav-label">Профиль</span>
      </Link>
    </nav>
  );
}
