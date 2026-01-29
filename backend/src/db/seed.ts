import 'dotenv/config';
/**
 * Seed script: optional initial data.
 * Run with: npm run db:seed
 * Currently no seed data; run db:migrate for schema only.
 */
import { getPool } from './pool.js';

async function seed() {
  const pool = getPool();
  // Example: add test user only if none exist (optional)
  const { rowCount } = await pool.query('SELECT 1 FROM users LIMIT 1');
  if (rowCount === 0) {
    console.log('No users found. Add seed data here if needed.');
  }
  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
