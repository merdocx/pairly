/**
 * Проверка: пользователь по email, его список «Моё» и оценки (рейтинги).
 * Запуск: npx tsx scripts/check-user-ratings.ts <email>
 */
import 'dotenv/config';
import { getPool } from '../src/db/pool.js';

const email = process.argv[2] || 'nvipetrenko@gmail.com';

async function main() {
  const pool = getPool();

  const userRow = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [email]);
  if (userRow.rows.length === 0) {
    console.log('Пользователь не найден:', email);
    process.exit(1);
  }
  const user = userRow.rows[0] as { id: string; email: string; name: string };
  console.log('Пользователь:', user.id, user.email, user.name);
  console.log('');

  const watchlist = await pool.query(
    `SELECT w.movie_id, w.media_type, w.title, w.vote_average AS w_vote_average, r.rating AS user_rating
     FROM watchlist w
     LEFT JOIN ratings r ON r.user_id = w.user_id AND r.movie_id = w.movie_id AND r.media_type = w.media_type
     WHERE w.user_id = $1
     ORDER BY w.added_at DESC
     LIMIT 30`,
    [user.id]
  );
  console.log('Список «Моё» (watchlist + рейтинг пользователя), до 30 записей:');
  console.log('movie_id | media_type | title (short) | vote_average (TMDB) | user_rating (оценка)');
  console.log('-'.repeat(80));
  for (const row of watchlist.rows as { movie_id: number; media_type: string; title: string | null; w_vote_average: number | null; user_rating: number | null }[]) {
    const titleShort = (row.title || '').slice(0, 35);
    console.log(`${row.movie_id} | ${row.media_type} | ${titleShort} | ${row.w_vote_average ?? 'NULL'} | ${row.user_rating ?? 'NULL'}`);
  }
  console.log('');
  console.log('Всего в списке:', watchlist.rows.length);

  const ratingsCount = await pool.query(
    'SELECT COUNT(*) AS c FROM ratings WHERE user_id = $1',
    [user.id]
  );
  console.log('Записей в таблице ratings (оценки пользователя):', ratingsCount.rows[0]?.c ?? 0);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
