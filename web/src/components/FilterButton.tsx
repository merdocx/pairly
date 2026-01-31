'use client';

import { FilterIcon } from '@/components/Icons';

type FilterButtonProps = {
  onClick: () => void;
  activeCount?: number;
  'aria-label'?: string;
};

export function FilterButton({ onClick, activeCount = 0, 'aria-label': ariaLabel = 'Фильтры' }: FilterButtonProps) {
  return (
    <button
      type="button"
      className="filter-fab"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={false}
    >
      <FilterIcon size={22} />
      {activeCount > 0 && (
        <span className="filter-fab-badge" aria-hidden>
          {activeCount > 9 ? '9+' : activeCount}
        </span>
      )}
    </button>
  );
}
