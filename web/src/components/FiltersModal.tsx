'use client';

import type { FilterState, SearchFilterState } from '@/lib/filters';

type FiltersModalProps = {
  open: boolean;
  closing: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  /** Полный набор фильтров (главная) */
  filterState?: FilterState;
  setFilterState?: (s: FilterState | ((prev: FilterState) => FilterState)) => void;
  /** Только поиск (тип + сортировка) */
  searchFilterState?: SearchFilterState;
  setSearchFilterState?: (s: SearchFilterState | ((prev: SearchFilterState) => SearchFilterState)) => void;
  genres: string[];
  showWatched: boolean;
  searchMode: boolean;
};

const YEAR_PRESETS = [
  { label: '2020-е', from: 2020, to: 2029 },
  { label: '2010-е', from: 2010, to: 2019 },
  { label: '2000-е', from: 2000, to: 2009 },
  { label: '1990-е', from: 1990, to: 1999 },
  { label: 'До 1990', from: null, to: 1989 },
];

export function FiltersModal({
  open,
  closing,
  onClose,
  onApply,
  onReset,
  filterState,
  setFilterState,
  searchFilterState,
  setSearchFilterState,
  genres,
  showWatched,
  searchMode,
}: FiltersModalProps) {
  if (!open && !closing) return null;

  const isSearch = searchMode && searchFilterState != null && setSearchFilterState != null;
  const isFull = !searchMode && filterState != null && setFilterState != null;

  return (
    <div
      className={`modal-overlay ${open && !closing ? 'modal-overlay--open' : ''} ${closing ? 'modal-overlay--closing' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-modal-title"
    >
      <div
        className={`modal-card ${open && !closing ? 'modal-card--open' : ''} ${closing ? 'modal-card--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="filters-modal-title" className="modal-card h2" style={{ marginBottom: 16 }}>
          Фильтры
        </h2>
        <button type="button" className="modal-close-x" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="filters-modal-sections">
          {/* Тип */}
          <section className="filters-modal-section">
            <h3 className="filters-modal-section-title">Тип</h3>
            <div className="filters-modal-options">
              {(['all', 'movie', 'tv'] as const).map((value) => {
                const label = value === 'all' ? 'Всё' : value === 'movie' ? 'Фильмы' : 'Сериалы';
                const checked = isSearch
                  ? searchFilterState!.mediaType === value
                  : filterState!.mediaType === value;
                return (
                  <label key={value} className="filters-modal-option">
                    <input
                      type="radio"
                      name="mediaType"
                      checked={checked}
                      onChange={() => {
                        if (isSearch) setSearchFilterState!((s) => ({ ...s, mediaType: value }));
                        else setFilterState!((s) => ({ ...s, mediaType: value }));
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Просмотрено — только для «Моё» */}
          {showWatched && isFull && (
            <section className="filters-modal-section">
              <h3 className="filters-modal-section-title">Просмотрено</h3>
              <div className="filters-modal-options">
                {(['all', 'yes', 'no'] as const).map((value) => {
                  const label = value === 'all' ? 'Всё' : value === 'yes' ? 'Да' : 'Нет';
                  return (
                    <label key={value} className="filters-modal-option">
                      <input
                        type="radio"
                        name="watched"
                        checked={filterState!.watched === value}
                        onChange={() => setFilterState!((s) => ({ ...s, watched: value }))}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* Год — только полный режим */}
          {isFull && (
            <section className="filters-modal-section">
              <h3 className="filters-modal-section-title">Год</h3>
              <div className="filters-modal-options filters-modal-options-wrap">
                <label className="filters-modal-option">
                  <input
                    type="radio"
                    name="year"
                    checked={filterState!.yearFrom == null && filterState!.yearTo == null}
                    onChange={() => setFilterState!((s) => ({ ...s, yearFrom: null, yearTo: null }))}
                  />
                  <span>Любой</span>
                </label>
                {YEAR_PRESETS.map((preset) => {
                  const checked =
                    filterState!.yearFrom === preset.from && filterState!.yearTo === preset.to;
                  return (
                    <label key={preset.label} className="filters-modal-option">
                      <input
                        type="radio"
                        name="year"
                        checked={checked}
                        onChange={() =>
                          setFilterState!((s) => ({
                            ...s,
                            yearFrom: preset.from,
                            yearTo: preset.to,
                          }))
                        }
                      />
                      <span>{preset.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* Жанр — только полный режим */}
          {isFull && genres.length > 0 && (
            <section className="filters-modal-section">
              <h3 className="filters-modal-section-title">Жанр</h3>
              <select
                className="filters-modal-select"
                value={filterState!.genre}
                onChange={(e) => setFilterState!((s) => ({ ...s, genre: e.target.value }))}
              >
                <option value="">Все жанры</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </section>
          )}

          {/* Сортировка */}
          <section className="filters-modal-section">
            <h3 className="filters-modal-section-title">Сортировка</h3>
            {isSearch ? (
              <div className="filters-modal-options">
                {(['default', 'year'] as const).map((value) => {
                  const label = value === 'default' ? 'Как в выдаче' : 'По году';
                  return (
                    <label key={value} className="filters-modal-option">
                      <input
                        type="radio"
                        name="searchSort"
                        checked={searchFilterState!.sortBy === value}
                        onChange={() =>
                          setSearchFilterState!((s) => ({ ...s, sortBy: value }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="filters-modal-options">
                  {[
                    { value: 'added_at' as const, label: 'По дате добавления' },
                    { value: 'title' as const, label: 'По названию' },
                    { value: 'year' as const, label: 'По году' },
                    { value: 'rating' as const, label: 'По оценке' },
                  ].map(({ value, label }) => (
                    <label key={value} className="filters-modal-option">
                      <input
                        type="radio"
                        name="sortBy"
                        checked={filterState!.sortBy === value}
                        onChange={() => setFilterState!((s) => ({ ...s, sortBy: value }))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="filters-modal-options" style={{ marginTop: 8 }}>
                  <label className="filters-modal-option">
                    <input
                      type="radio"
                      name="sortOrder"
                      checked={filterState!.sortOrder === 'desc'}
                      onChange={() => setFilterState!((s) => ({ ...s, sortOrder: 'desc' }))}
                    />
                    <span>По убыванию</span>
                  </label>
                  <label className="filters-modal-option">
                    <input
                      type="radio"
                      name="sortOrder"
                      checked={filterState!.sortOrder === 'asc'}
                      onChange={() => setFilterState!((s) => ({ ...s, sortOrder: 'asc' }))}
                    />
                    <span>По возрастанию</span>
                  </label>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="filters-modal-actions">
          <button type="button" className="btn-rate-secondary" onClick={onReset}>
            Сбросить
          </button>
          <button type="button" className="btn-login-primary" style={{ flex: 1 }} onClick={onApply}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
