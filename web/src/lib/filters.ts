/** Состояние фильтров (только уже отображаемые карточки). */
export type FilterState = {
  mediaType: 'all' | 'movie' | 'tv';
  watched: 'all' | 'yes' | 'no';
  yearFrom: number | null;
  yearTo: number | null;
  genre: string;
  sortBy: 'added_at' | 'rating' | 'title' | 'year';
  sortOrder: 'asc' | 'desc';
};

export const defaultFilterState: FilterState = {
  mediaType: 'all',
  watched: 'all',
  yearFrom: null,
  yearTo: null,
  genre: '',
  sortBy: 'added_at',
  sortOrder: 'desc',
};

/** Состояние фильтров для поиска (только тип и сортировка). */
export type SearchFilterState = {
  mediaType: 'all' | 'movie' | 'tv';
  sortBy: 'default' | 'year';
  sortOrder: 'asc' | 'desc';
};

export const defaultSearchFilterState: SearchFilterState = {
  mediaType: 'all',
  sortBy: 'default',
  sortOrder: 'desc',
};

function yearFromReleaseDate(releaseDate: string | null | undefined): number | null {
  if (releaseDate == null || String(releaseDate).trim() === '') return null;
  const y = parseInt(String(releaseDate).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/** Уникальные жанры из списка (genre — строка "Жанр1, Жанр2"). */
export function getUniqueGenres(items: Array<{ genre?: string | null }>): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const g = item.genre;
    if (typeof g !== 'string' || !g.trim()) continue;
    for (const part of g.split(',')) {
      const t = part.trim();
      if (t) set.add(t);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
}

type WatchlistLike = {
  media_type: 'movie' | 'tv';
  release_date?: string | null;
  genre?: string | null;
  rating?: number | null;
  added_at?: string;
  title?: string;
};

export function filterAndSortWatchlist<T extends WatchlistLike>(
  items: T[],
  state: FilterState
): T[] {
  let list = items.slice();

  if (state.mediaType !== 'all') {
    list = list.filter((i) => i.media_type === state.mediaType);
  }
  if (state.watched !== 'all') {
    const hasRating = (i: T) => i.rating != null && Number.isFinite(i.rating);
    if (state.watched === 'yes') list = list.filter(hasRating);
    else list = list.filter((i) => !hasRating(i));
  }
  if (state.yearFrom != null || state.yearTo != null) {
    list = list.filter((i) => {
      const y = yearFromReleaseDate(i.release_date ?? null);
      if (y == null) return false;
      if (state.yearFrom != null && y < state.yearFrom) return false;
      if (state.yearTo != null && y > state.yearTo) return false;
      return true;
    });
  }
  if (state.genre) {
    list = list.filter((i) => {
      const g = i.genre;
      if (typeof g !== 'string' || !g.trim()) return false;
      return g.split(',').some((p) => p.trim().toLowerCase() === state.genre.toLowerCase());
    });
  }

  const mult = state.sortOrder === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    switch (state.sortBy) {
      case 'title':
        return mult * (a.title || '').localeCompare(b.title || '', 'ru');
      case 'year': {
        const ya = yearFromReleaseDate(a.release_date ?? null) ?? 0;
        const yb = yearFromReleaseDate(b.release_date ?? null) ?? 0;
        return mult * (ya - yb);
      }
      case 'rating': {
        const ra = a.rating != null && Number.isFinite(a.rating) ? a.rating : -1;
        const rb = b.rating != null && Number.isFinite(b.rating) ? b.rating : -1;
        return mult * (ra - rb);
      }
      case 'added_at':
      default: {
        const ta = a.added_at ? new Date(a.added_at).getTime() : 0;
        const tb = b.added_at ? new Date(b.added_at).getTime() : 0;
        return mult * (ta - tb);
      }
    }
  });
  return list;
}

type SearchResultLike = {
  id: number;
  media_type: 'movie' | 'tv';
  release_date?: string | null;
};

export function filterAndSortSearch<T extends SearchResultLike>(
  items: T[],
  state: SearchFilterState
): T[] {
  let list = items.slice();
  if (state.mediaType !== 'all') {
    list = list.filter((i) => i.media_type === state.mediaType);
  }
  if (state.sortBy === 'year') {
    const mult = state.sortOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const ya = yearFromReleaseDate(a.release_date ?? null) ?? 0;
      const yb = yearFromReleaseDate(b.release_date ?? null) ?? 0;
      return mult * (ya - yb);
    });
  }
  return list;
}

export function countActiveFilters(state: FilterState): number {
  let n = 0;
  if (state.mediaType !== 'all') n++;
  if (state.watched !== 'all') n++;
  if (state.yearFrom != null || state.yearTo != null) n++;
  if (state.genre) n++;
  if (state.sortBy !== 'added_at' || state.sortOrder !== 'desc') n++;
  return n;
}

export function countActiveSearchFilters(state: SearchFilterState): number {
  let n = 0;
  if (state.mediaType !== 'all') n++;
  if (state.sortBy !== 'default' || state.sortOrder !== 'desc') n++;
  return n;
}
