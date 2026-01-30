'use client';

/** Отображает 1–5 звёзд. value 1–10 из API: показываем value/2 звёзд. */
export function StarRatingDisplay({ value }: { value: number | null }) {
  const stars = value != null ? Math.round(value / 2) : 0;
  return (
    <span className="star-rating" aria-label={`Оценка ${stars} из 5`}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= stars ? (
          <span key={i} className="star-filled" aria-hidden>
            <StarIcon filled />
          </span>
        ) : (
          <span key={i} className="star-empty" aria-hidden>
            <StarIcon filled={false} />
          </span>
        )
      )}
    </span>
  );
}

/** Интерактивный выбор 1–5 звёзд. onChange(1–5), в API отправляем rating*2 (2,4,6,8,10). */
export function StarRatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (stars: number) => void;
}) {
  const stars = value != null ? Math.round(value / 2) : 0;
  return (
    <div className="star-rating" role="group" aria-label="Оценка">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={i <= stars ? 'star-filled' : 'star-empty'}
          onClick={() => onChange(i * 2)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          aria-label={`${i} из 5`}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            display: 'inline-flex',
          }}
        >
          <StarIcon filled={i <= stars} />
        </button>
      ))}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
