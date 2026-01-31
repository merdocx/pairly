import 'dotenv/config';
import { app } from './app.js';
import { getPool } from './db/pool.js';
import { getRedis } from './db/redis.js';

const PORT = Number(process.env.PORT) || 4000;
const DEFAULT_JWT = 'dev-secret-change-in-production';

function checkProdConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  const jwt = process.env.JWT_SECRET;
  const origin = process.env.WEB_ORIGIN ?? '';
  const tmdbKey = process.env.TMDB_API_KEY ?? '';
  if (!jwt || jwt === DEFAULT_JWT) {
    console.error('[SECURITY] В production задайте свой длинный случайный JWT_SECRET в .env (например: openssl rand -base64 32)');
    process.exit(1);
  }
  if (origin.includes('*') || origin.trim() === '') {
    console.warn('[SECURITY] В проде задайте WEB_ORIGIN без *, только нужные домены через запятую');
  }
  if (!tmdbKey || tmdbKey === 'your_tmdb_api_key_here') {
    console.warn('[CONFIG] В проде задайте TMDB_API_KEY в .env для поиска и деталей фильмов');
  }
}

async function main() {
  checkProdConfig();
  await getPool().query('SELECT 1');
  await getRedis().ping();
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
