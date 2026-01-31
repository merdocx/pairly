/**
 * Разовый бэкфилл: заполнить watchlist.vote_average из TMDB для строк, где он NULL.
 * Запуск: npx tsx scripts/backfill-vote-average.ts
 */
import 'dotenv/config';
import pLimit from 'p-limit';
import { getPool } from '../src/db/pool.js';
import { getMovieDetail, getTvDetail } from '../src/services/tmdb.js';

const limit = pLimit(5);

async function main() {
  const pool = getPool();
  const rows = await pool.query(
    `SELECT user_id, movie_id, media_type FROM watchlist WHERE vote_average IS NULL`
  );
  console.log('Строк с vote_average IS NULL:', rows.rows.length);
  let updated = 0;
  let errors = 0;
  for (const row of rows.rows as { user_id: string; movie_id: number; media_type: string }[]) {
    await limit(async () => {
      try {
        const d = row.media_type === 'tv'
          ? await getTvDetail(row.movie_id)
          : await getMovieDetail(row.movie_id);
        const va = (d as { vote_average?: number }).vote_average;
        if (typeof va === 'number' && Number.isFinite(va)) {
          await pool.query(
            'UPDATE watchlist SET vote_average = $1 WHERE user_id = $2 AND movie_id = $3 AND media_type = $4',
            [va, row.user_id, row.movie_id, row.media_type]
          );
          updated++;
          if (updated % 20 === 0) console.log('Обновлено:', updated);
        }
      } catch (e) {
        errors++;
      }
    });
  }
  console.log('Готово. Обновлено:', updated, 'Ошибок:', errors);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
