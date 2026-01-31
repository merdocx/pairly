/**
 * Показывается при навигации между страницами (в т.ч. клиентской),
 * пока загружается сегмент — убирает белый экран при переходе.
 */
export default function Loading() {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="Загрузка">
      <div className="loading-screen-logo" aria-hidden style={{ fontSize: 40, lineHeight: 1 }}>∞</div>
      <div className="loading-spinner" aria-hidden />
      <p className="loading-screen-text">Загрузка…</p>
    </div>
  );
}
