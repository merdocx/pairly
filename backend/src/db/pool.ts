import pg from 'pg';

const { Pool } = pg;

const SLOW_QUERY_MS = 500;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

const origQuery = pool.query.bind(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).query = function (text: unknown, values?: unknown, callback?: (err: Error, result: pg.QueryResult) => void): void | Promise<pg.QueryResult> {
  if (typeof callback === 'function') {
    return origQuery(text as string, values as unknown[], callback) as void;
  }
  const start = Date.now();
  return (origQuery(text as string, values as unknown[]) as Promise<pg.QueryResult>).then((r) => {
    const ms = Date.now() - start;
    if (ms > SLOW_QUERY_MS) {
      const preview = typeof text === 'string' ? text.substring(0, 120) : '(config)';
      console.error(`[${new Date().toISOString()}] slow query (${ms}ms)`, preview);
    }
    return r;
  });
};

export function getPool() {
  return pool;
}
