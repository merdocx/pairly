'use client';

/** Отображает 1–10 звёзд. value 1–10 из API. */
export function StarRatingDisplay({
  value,
  size = 'modal',
  variant = 'mine',
}: {
  value: number | null;
  size?: 'card' | 'modal' | 'rate';
  variant?: 'mine' | 'partner';
}) {
  const num = value != null ? Number(value) : 0;
  const stars = Number.isNaN(num) ? 0 : Math.min(10, Math.max(0, Math.round(num)));
  const className = `star-rating star-rating--${size} ${variant === 'partner' ? 'star-rating--partner' : ''}`;
  return (
    <span className={className} aria-label={variant === 'partner' ? `Оценка партнёра ${stars} из 10` : `Оценка ${stars} из 10`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) =>
        i <= stars ? (
          <span key={i} className="star-filled" aria-hidden>
            <StarIcon size={size} filled />
          </span>
        ) : (
          <span key={i} className="star-empty" aria-hidden>
            <StarIcon size={size} filled={false} />
          </span>
        )
      )}
    </span>
  );
}

/** Интерактивный выбор 1–10 звёзд. value/onChange 1–10. */
export function StarRatingInput({
  value,
  onChange,
  size = 'rate',
}: {
  value: number | null;
  onChange: (rating: number) => void;
  size?: 'card' | 'modal' | 'rate';
}) {
  const stars = value != null ? Math.min(10, Math.max(0, Math.round(value))) : 0;
  return (
    <div className={`star-rating star-rating--${size}`} role="group" aria-label="Оценка">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <button
          key={i}
          type="button"
          className={i <= stars ? 'star-filled' : 'star-empty'}
          onClick={() => onChange(i)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          aria-label={`${i} из 10`}
          style={{
            background: 'none',
            border: 'none',
            padding: size === 'rate' ? 8 : 4,
            cursor: 'pointer',
            display: 'inline-flex',
          }}
        >
          <StarIcon size={size} filled={i <= stars} />
        </button>
      ))}
    </div>
  );
}

const sizeMap = { card: 12, modal: 16, rate: 28 };

function StarIcon({ filled, size = 'modal' }: { filled: boolean; size?: 'card' | 'modal' | 'rate' }) {
  const px = sizeMap[size];
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
