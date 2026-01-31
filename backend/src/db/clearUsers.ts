/**
 * Очистка таблицы users и всех связанных данных (pairs, watchlist, ratings).
 * Запуск: npx tsx src/db/clearUsers.ts
 */
import 'dotenv/config';
import { getPool } from './pool.js';

async function main() {
  const pool = getPool();
  await pool.query('TRUNCATE users CASCADE');
  console.log('Users and related data (pairs, watchlist, ratings) cleared.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
