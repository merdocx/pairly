import 'dotenv/config';
import { app } from './app.js';
import { getPool } from './db/pool.js';
import { getRedis } from './db/redis.js';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
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
